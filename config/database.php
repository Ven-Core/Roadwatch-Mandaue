<?php
date_default_timezone_set('Asia/Manila');

$USE_INFINITYFREE = 0;

if ($USE_INFINITYFREE == 1) {
    $host = 'sql202.infinityfree.com';
    $username = 'if0_41411024';
    $password = 'H6KNvqKWB1jz1lM';
    $database = 'if0_41411024_rwm';
} else {
    $host = 'localhost';
    $username = 'root';
    $password = '';
    $database = 'roadwatch';
}

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>