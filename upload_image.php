<?php
// Simple image uploader for characters, weapons, spells
// Usage: POST multipart/form-data with fields:
//   type: one of chars|weapons|spells
//   file: the image file (png/jpg/jpeg/webp)
// Saves to ./uploads/{type}/{id}_{filename}
// Returns JSON: { ok: true, url: "uploads/{type}/{file}" }

header('Content-Type: application/json');

$allowedTypes = ['chars','weapons','spells'];
$type = isset($_POST['type']) ? strtolower(trim($_POST['type'])) : '';
if (!in_array($type, $allowedTypes)) {
  echo json_encode(['ok'=>false, 'error'=>'invalid type']);
  exit;
}

if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])){
  echo json_encode(['ok'=>false, 'error'=>'no file']);
  exit;
}

$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['png','jpg','jpeg','webp'])){
  echo json_encode(['ok'=>false, 'error'=>'invalid extension']);
  exit;
}

$base = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $type;
if (!is_dir($base)) { @mkdir($base, 0777, true); }
$id = uniqid($type.'_');
$safeName = preg_replace('/[^A-Za-z0-9_\.-]/','_', $_FILES['file']['name']);
$dest = $base . DIRECTORY_SEPARATOR . ($id . '_' . $safeName);

if (!@move_uploaded_file($_FILES['file']['tmp_name'], $dest)){
  echo json_encode(['ok'=>false, 'error'=>'failed to move upload']);
  exit;
}

$url = 'uploads/'.$type.'/'.basename($dest);
echo json_encode(['ok'=>true, 'url'=>$url]);
exit;

