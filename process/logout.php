<?php
session_start();

$_SESSION = [];
session_unset();
session_destroy();

echo json_encode([
    "status" => "success"
]);

exit();