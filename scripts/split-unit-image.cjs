// Exact, non-generative image preparation. NODE_PATH must provide sharp.
// node scripts/split-unit-image.cjs Ha/carrot-original.png HapeeCarrot
// node scripts/split-unit-image.cjs assets/puzzle-originals/comics/A-2-2-4.jpg ComicA224 crop 0 90
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const [source, name, mode = 'contain', cropLeft, webpQuality] = process.argv.slice(2);
assert(source && /^[A-Za-z][A-Za-z0-9-]*$/.test(name || ''), 'Provide an image path and safe asset folder name');
assert(['contain', 'crop'].includes(mode), 'Mode must be contain or crop');
assert(cropLeft === undefined || mode === 'crop', 'A crop offset requires crop mode');
assert(webpQuality === undefined || (Number.isInteger(Number(webpQuality)) && Number(webpQuality) >= 1 && Number(webpQuality) <= 100), 'WebP quality must be 1..100');
(async () => {
  const columns = 3;
  let side = 960, crop;
  let pipeline = sharp(source).rotate();
  if (mode === 'crop') {
    // Decode once, crop actual source pixels, and never enlarge small originals.
    const original = await pipeline.toColourspace('srgb').flatten({background:'#ffffff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const { width, height, channels } = original.info;
    const edge = Math.min(width, height);
    const left = cropLeft === undefined ? Math.floor((width - edge) / 2) : Number(cropLeft);
    const top = Math.floor((height - edge) / 2);
    assert(Number.isInteger(left) && left >= 0 && left + edge <= width, 'Crop must stay within the original image');
    side = Math.min(960, Math.floor(edge / columns) * columns);
    assert(side >= columns, 'Image is too small for nine pieces');
    crop = {sourceWidth:width, sourceHeight:height, left, top, width:edge, height:edge, right:width-left-edge, bottom:height-top-edge};
    pipeline = sharp(original.data, {raw:{width,height,channels}})
      .extract({left,top,width:edge,height:edge}).resize(side, side);
  } else {
    // Preserve the previous preparation of existing single-character artwork.
    pipeline = pipeline.resize(side, side, {fit:'contain', background:'#ffffff'});
  }
  const cell = side / columns;
  const target = path.resolve('optimized', name);
  fs.mkdirSync(target, {recursive:true});
  fs.mkdirSync('optimized/unit', {recursive:true});
  const square = await pipeline.toColourspace('srgb')
    .flatten({background:'#ffffff'}).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const raw = {width:side, height:side, channels:3};
  const preview = path.resolve('optimized/unit', `${name}.webp`);
  await sharp(square.data, {raw}).webp(webpQuality === undefined ? {lossless:true} : {quality:Number(webpQuality),effort:6}).toFile(preview);
  // Photos are compressed once as a whole, then split losslessly from that
  // decoded preview. Tiles and the reveal stay pixel-identical at every edge.
  const canonicalPixels = await sharp(preview).removeAlpha().raw().toBuffer();
  const pieces = [];
  for (let index=0; index<columns*columns; index++) {
    const file=path.join(target, `${index+1}.webp`);
    await sharp(canonicalPixels,{raw}).extract({left:(index%columns)*cell,top:Math.floor(index/columns)*cell,width:cell,height:cell})
      .webp({lossless:true}).toFile(file);
    pieces.push(file);
  }
  // Verify exact pixel alignment: all lossless tiles must reconstruct the preview.
  const assembled=await sharp({create:{width:side,height:side,channels:3,background:'#fff'}})
    .composite(pieces.map((input,index)=>({input,left:(index%columns)*cell,top:Math.floor(index/columns)*cell})))
    .removeAlpha().raw().toBuffer();
  assert(assembled.equals(canonicalPixels),'Tiles must reconstruct the preview exactly');
  if (webpQuality === undefined) assert(canonicalPixels.equals(square.data),'Lossless preview must match the normalized original');
  console.log(JSON.stringify({source,preview,mode,crop,webpQuality:webpQuality === undefined ? 'lossless' : Number(webpQuality),columns,rows:columns,side,cell,
    exactPixelReconstruction:true,bytes:[preview,...pieces].reduce((sum,f)=>sum+fs.statSync(f).size,0)}));
})().catch(error=>{console.error(error);process.exitCode=1;});
