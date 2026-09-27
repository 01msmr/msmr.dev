<?php
// Web-App-Manifest mit Icon in einer zufälligen Projektfarbe (wie Favicon und iOS-Icon)
header('Content-Type: application/manifest+json');
header('Cache-Control: no-store');
$n = random_int(0, 6);
echo json_encode([
  'name'             => 'msmr.dev',
  'short_name'       => 'msmr',
  'start_url'        => '/',
  'display'          => 'standalone',
  'background_color' => '#fafaf8',
  'theme_color'      => '#fafaf8',
  'icons'            => [
    ['src' => "icons/icon-192-$n.png", 'sizes' => '192x192', 'type' => 'image/png'],
    ['src' => "icons/icon-512-$n.png", 'sizes' => '512x512', 'type' => 'image/png'],
  ],
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
