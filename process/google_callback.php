<?php
session_start();
require_once '../config/database.php';

$client_id = '141766128390-2okr50lur3ebmoupq4d1bsd8srhvcjjc.apps.googleusercontent.com';
$client_secret = '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';
$redirect_uri = 'http://localhost/rw/process/google_callback.php';

if (!isset($_GET['code'])) {
    $_SESSION['error'] = 'Authorization code not found';
    header('Location: ../register.html');
    exit();
}

$code = $_GET['code'];

$token_url = 'https://oauth2.googleapis.com/token';
$token_data = [
    'code' => $code,
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'redirect_uri' => $redirect_uri,
    'grant_type' => 'authorization_code'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $token_url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($token_data));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code != 200) {
    $_SESSION['error'] = 'Failed to get access token';
    header('Location: ../register.html');
    exit();
}

$token = json_decode($response, true);
$access_token = $token['access_token'];

$userinfo_url = 'https://www.googleapis.com/oauth2/v3/userinfo';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $userinfo_url);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $access_token]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$user_response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code != 200) {
    $_SESSION['error'] = 'Failed to get user information';
    header('Location: ../register.html');
    exit();
}

$google_user = json_decode($user_response, true);
$google_id = $google_user['sub'];
$email = $google_user['email'];
$full_name = $google_user['name'];
$google_picture = isset($google_user['picture']) ? $google_user['picture'] : null;

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $_SESSION['error'] = 'Invalid email from Google';
    header('Location: ../register.html');
    exit();
}

$profile_picture_path = null;

if ($google_picture) {
    $upload_dir = __DIR__ . '/../media/profile_picture/';
    
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    
    $image_content = @file_get_contents($google_picture);
    
    if ($image_content !== false) {
        $image_info = getimagesizefromstring($image_content);
        
        if ($image_info !== false) {
            $mime_type = $image_info['mime'];
            
            switch ($mime_type) {
                case 'image/jpeg':
                    $extension = 'jpg';
                    break;
                case 'image/png':
                    $extension = 'png';
                    break;
                case 'image/webp':
                    $extension = 'webp';
                    break;
                case 'image/gif':
                    $extension = 'gif';
                    break;
                default:
                    $extension = 'jpg';
                    break;
            }
            
            $safe_name = preg_replace('/[^a-zA-Z0-9_]/', '_', $full_name);
            $safe_email = preg_replace('/[^a-zA-Z0-9_]/', '_', $email);
            $filename = $safe_name . '-' . $safe_email . '.' . $extension;
            $filename = strtolower($filename);
            
            $counter = 1;
            $original_filename = $filename;
            while (file_exists($upload_dir . $filename)) {
                $filename = pathinfo($original_filename, PATHINFO_FILENAME) . '_' . $counter . '.' . $extension;
                $counter++;
            }
            
            $file_saved = file_put_contents($upload_dir . $filename, $image_content);
            
            if ($file_saved !== false) {
                $profile_picture_path = 'media/profile_picture/' . $filename;
            }
        }
    }
}

$check_query = "SELECT id, username, usertype, is_verified, is_Ban, is_Mute, profile_picture FROM users WHERE email = ? OR google_id = ?";
$check_stmt = $conn->prepare($check_query);
$check_stmt->bind_param("ss", $email, $google_id);
$check_stmt->execute();
$check_result = $check_stmt->get_result();

if ($check_result->num_rows > 0) {
    $user = $check_result->fetch_assoc();
    
    if ($user['is_Ban'] == 1) {
        $_SESSION['error'] = 'Your account has been banned';
        header('Location: ../register.html');
        exit();
    }
    
    if (empty($user['profile_picture']) && $profile_picture_path) {
        $update_query = "UPDATE users SET google_id = ?, profile_picture = ?, is_verified = 1 WHERE email = ?";
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bind_param("sss", $google_id, $profile_picture_path, $email);
        $update_stmt->execute();
        $final_profile_picture = $profile_picture_path;
    } else {
        $update_query = "UPDATE users SET google_id = ?, is_verified = 1 WHERE email = ?";
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bind_param("ss", $google_id, $email);
        $update_stmt->execute();
        $final_profile_picture = $user['profile_picture'];
    }
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $email;
    $_SESSION['usertype'] = $user['usertype'];
    $_SESSION['is_verified'] = 1;
    $_SESSION['profile_picture'] = $final_profile_picture;
    
    header('Location: ../index.html');
    exit();
}

$username_base = strtolower(str_replace(' ', '_', $full_name));
$username_base = preg_replace('/[^a-zA-Z0-9_]/', '', $username_base);
$username = $username_base;

if (strlen($username) < 3) {
    $username = 'user_' . bin2hex(random_bytes(4));
}

$check_username_query = "SELECT id FROM users WHERE username = ?";
$check_username_stmt = $conn->prepare($check_username_query);
$check_username_stmt->bind_param("s", $username);
$check_username_stmt->execute();
$check_username_result = $check_username_stmt->get_result();

if ($check_username_result->num_rows > 0) {
    $counter = 1;
    $original_username = $username;
    do {
        $username = $original_username . '_' . $counter;
        $check_username_stmt->bind_param("s", $username);
        $check_username_stmt->execute();
        $check_username_result = $check_username_stmt->get_result();
        $counter++;
    } while ($check_username_result->num_rows > 0);
}

$insert_query = "INSERT INTO users (full_name, username, email, password, google_id, profile_picture, usertype, is_verified, is_Ban, is_Mute) 
                 VALUES (?, ?, ?, '', ?, ?, 'user', 1, 0, 0)";
$insert_stmt = $conn->prepare($insert_query);
$insert_stmt->bind_param("sssss", $full_name, $username, $email, $google_id, $profile_picture_path);
$insert_stmt->execute();

$user_id = $conn->insert_id;

$_SESSION['user_id'] = $user_id;
$_SESSION['username'] = $username;
$_SESSION['email'] = $email;
$_SESSION['usertype'] = 'user';
$_SESSION['is_verified'] = 1;
$_SESSION['profile_picture'] = $profile_picture_path;

header('Location: ../index.html');
exit();