<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

date_default_timezone_set('Asia/Manila');

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'status' => 'success',
        'logged_in' => false
    ]);
    exit();
}

$user_query = "SELECT id, username, email, full_name, usertype, is_verified, is_dark, profile_picture, is_Ban, is_Mute, expire_mute FROM users WHERE id = ?";
$user_stmt = $conn->prepare($user_query);
$user_stmt->bind_param("i", $_SESSION['user_id']);
$user_stmt->execute();
$user_result = $user_stmt->get_result();

if ($user_result->num_rows === 0) {
    session_destroy();
    
    echo json_encode([
        'status' => 'success',
        'logged_in' => false
    ]);
    exit();
}

$user = $user_result->fetch_assoc();

if ($user['is_Ban'] == 1) {
    session_destroy();
    
    echo json_encode([
        'status' => 'error',
        'logged_in' => false,
        'message' => 'Your account has been banned'
    ]);
    exit();
}

if ($user['is_Mute'] == 1 && $user['expire_mute'] !== null) {
    if (strtotime($user['expire_mute']) < time()) {
        $unmute_query = "UPDATE users SET is_Mute = 0, expire_mute = NULL WHERE id = ?";
        $unmute_stmt = $conn->prepare($unmute_query);
        $unmute_stmt->bind_param("i", $user['id']);
        $unmute_stmt->execute();
        
        $user['is_Mute'] = 0;
    }
}

$_SESSION['usertype'] = $user['usertype'];
$_SESSION['is_verified'] = $user['is_verified'];
$_SESSION['is_dark'] = $user['is_dark'];
$_SESSION['profile_picture'] = $user['profile_picture'];

echo json_encode([
    'status' => 'success',
    'logged_in' => true,
    'user_id' => $user['id'],
    'username' => $user['username'],
    'email' => $user['email'],
    'full_name' => $user['full_name'],
    'usertype' => $user['usertype'],
    'is_verified' => $user['is_verified'],
    'is_dark' => $user['is_dark'],
    'profile_picture' => $user['profile_picture'],
    'is_Mute' => $user['is_Mute']
]);
?>