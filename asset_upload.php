<?php
// Simple multi-asset uploader for OBJ/MTL + textures
// Saves under ./assets/{id}/ and writes asset.json in each folder
// Returns JSON: { assets: [ { id, name, objUrl, mtlUrl, textures: [url,...] } ] }

header('Content-Type: application/json');

$baseDir = __DIR__ . DIRECTORY_SEPARATOR . 'assets';
if (!is_dir($baseDir)) { @mkdir($baseDir, 0777, true); }

if (!isset($_FILES['files'])) {
  echo json_encode([ 'error' => 'No files' ]);
  exit;
}

// Normalize uploaded files array
$names = $_FILES['files']['name'];
$tmps  = $_FILES['files']['tmp_name'];
$errors= $_FILES['files']['error'];
$files = [];
for ($i=0; $i<count($names); $i++) {
  if ($errors[$i] !== UPLOAD_ERR_OK) continue;
  $files[] = [ 'name' => $names[$i], 'tmp' => $tmps[$i] ];
}

// Group by OBJ basename
$objs = [];
foreach ($files as $f) {
  $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
  if ($ext === 'obj') {
    $base = strtolower(pathinfo($f['name'], PATHINFO_FILENAME));
    $objs[$base] = true;
  }
}

$assetsOut = [];
foreach (array_keys($objs) as $base) {
  $id = uniqid('asset_');
  $dir = $baseDir . DIRECTORY_SEPARATOR . $id;
  @mkdir($dir, 0777, true);

  $objName = null; $mtlName = null; $texNames = [];
  foreach ($files as $f) {
    $name = $f['name'];
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    $bn  = strtolower(pathinfo($name, PATHINFO_FILENAME));
    if ($bn !== $base && ($ext === 'obj' || $ext === 'mtl')) continue; // only pair exact base OBJ/MTL
    $dest = $dir . DIRECTORY_SEPARATOR . $name;
    @move_uploaded_file($f['tmp'], $dest);
    if ($ext === 'obj') $objName = $name;
    else if ($ext === 'mtl') $mtlName = $name;
    else if (in_array($ext, ['png','jpg','jpeg','webp'])) $texNames[] = $name;
  }

  // Also copy any remaining textures (loose) once
  foreach ($files as $f) {
    $name = $f['name']; $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (in_array($ext, ['png','jpg','jpeg','webp']) && !file_exists($dir . DIRECTORY_SEPARATOR . $name)) {
      @move_uploaded_file($f['tmp'], $dir . DIRECTORY_SEPARATOR . $name);
      $texNames[] = $name;
    }
  }

  $asset = [ 'id'=>$id, 'name'=>$base, 'files'=>[ 'obj'=>$objName, 'mtl'=>$mtlName, 'textures'=>$texNames ] ];
  file_put_contents($dir . DIRECTORY_SEPARATOR . 'asset.json', json_encode($asset));
  $assetsOut[] = [
    'id'=>$id,
    'name'=>$base,
    'objUrl'=> $objName ? ('assets/'.$id.'/'.$objName) : null,
    'mtlUrl'=> $mtlName ? ('assets/'.$id.'/'.$mtlName) : null,
    'textures'=> array_map(function($t) use ($id){ return 'assets/'.$id.'/'.$t; }, $texNames)
  ];
}

echo json_encode([ 'assets' => $assetsOut ]);
