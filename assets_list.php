<?php
header('Content-Type: application/json');
$baseDir = __DIR__ . DIRECTORY_SEPARATOR . 'assets';
$list = [];
if (is_dir($baseDir)) {
  foreach (scandir($baseDir) as $entry) {
    if ($entry === '.' || $entry === '..') continue;
    $dir = $baseDir . DIRECTORY_SEPARATOR . $entry;
    if (!is_dir($dir)) continue;
    $meta = $dir . DIRECTORY_SEPARATOR . 'asset.json';
    if (!is_file($meta)) continue;
    $data = json_decode(file_get_contents($meta), true);
    if (!$data) continue;
    $obj = isset($data['files']['obj']) ? ('assets/'.$entry.'/'.$data['files']['obj']) : null;
    $mtl = isset($data['files']['mtl']) ? ('assets/'.$entry.'/'.$data['files']['mtl']) : null;
    $tex = [];
    if (isset($data['files']['textures']) && is_array($data['files']['textures'])) {
      foreach ($data['files']['textures'] as $t) { $tex[] = 'assets/'.$entry.'/'.$t; }
    }
    $list[] = [ 'id'=>$data['id'] ?? $entry, 'name'=>$data['name'] ?? $entry, 'objUrl'=>$obj, 'mtlUrl'=>$mtl, 'textures'=>$tex ];
  }
}
echo json_encode([ 'assets' => $list ]);
