<?php
session_start();
require_once '../config/database.php';
require_once '../config/mail_config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

if (!isset($_POST['action'])) {
    echo json_encode(['status' => 'error', 'message' => 'No action specified']);
    exit();
}

$action = $_POST['action'];

switch ($action) {
    case 'register':
        handleRegister($conn);
        break;
    case 'login':
        handleLogin($conn);
        break;
    case 'forgot_password':
        handleForgotPassword($conn);
        break;
    case 'update_theme':
        handleUpdateTheme($conn);
        break;
    case 'update_account':
        handleUpdateAccount($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}

function generateOTP() {
    return str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function handleRegister($conn) {

    $secret = "0x4AAAAAADXAa4N4yAix9K_ug86PiBvPVm8";

    $token = $_POST['cf-turnstile-response'] ?? '';

    if (empty($token)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Please complete the captcha'
        ]);
        exit();
    }

    $data = [
        'secret' => $secret,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR']
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data)
        ]
    ];

    $context = stream_context_create($options);

    $result = file_get_contents(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        false,
        $context
    );

    $response = json_decode($result);

    if (!$response || !$response->success) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Captcha verification failed'
        ]);
        exit();
    }

    $full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $email = isset($_POST['email']) ? trim($_POST['email']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';
    $confirm_password = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';

    if (empty($full_name) || empty($username) || empty($email) || empty($password) || empty($confirm_password)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'All fields are required'
        ]);
        exit();
    }

    if (strlen($username) < 3 || strlen($username) > 50) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Username must be between 3 and 50 characters'
        ]);
        exit();
    }

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Username can only contain letters, numbers, and underscores'
        ]);
        exit();
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email address'
        ]);
        exit();
    }

    if (strlen($password) < 6) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Password must be at least 6 characters'
        ]);
        exit();
    }

    if ($password !== $confirm_password) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Passwords do not match'
        ]);
        exit();
    }

    $check_query = "SELECT id FROM users WHERE username = ? OR email = ?";

    $check_stmt = $conn->prepare($check_query);

    $check_stmt->bind_param("ss", $username, $email);

    $check_stmt->execute();

    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {

        $check_stmt->close();

        $check_specific = "SELECT username, email FROM users WHERE username = ? OR email = ?";

        $check_specific_stmt = $conn->prepare($check_specific);

        $check_specific_stmt->bind_param("ss", $username, $email);

        $check_specific_stmt->execute();

        $specific_result = $check_specific_stmt->get_result();

        $row = $specific_result->fetch_assoc();

        if ($row['username'] === $username) {

            echo json_encode([
                'status' => 'error',
                'message' => 'Username already exists'
            ]);

        } else {

            echo json_encode([
                'status' => 'error',
                'message' => 'Email already exists'
            ]);
        }

        exit();
    }

    $hashed_password = password_hash($password, PASSWORD_ARGON2ID);

    $usertype = 'user';
    $is_verified = 0;
    $is_Ban = 0;
    $is_Mute = 0;

    $expire_mute = null;
    $google_id = null;
    $profile_picture = null;

    $insert_query = "INSERT INTO users (
        full_name,
        username,
        email,
        password,
        google_id,
        profile_picture,
        usertype,
        is_verified,
        is_Ban,
        is_Mute,
        expire_mute
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $insert_stmt = $conn->prepare($insert_query);

    $insert_stmt->bind_param(
        "sssssssiiis",
        $full_name,
        $username,
        $email,
        $hashed_password,
        $google_id,
        $profile_picture,
        $usertype,
        $is_verified,
        $is_Ban,
        $is_Mute,
        $expire_mute
    );

    if ($insert_stmt->execute()) {

        $user_id = $conn->insert_id;

        $_SESSION['user_id'] = $user_id;
        $_SESSION['username'] = $username;
        $_SESSION['email'] = $email;
        $_SESSION['usertype'] = $usertype;
        $_SESSION['is_verified'] = $is_verified;

        $otp_code = generateOTP();

        $expires_at = date(
            'Y-m-d H:i:s',
            strtotime('+5 minutes')
        );

        $otp_query = "INSERT INTO otp_codes (
            email,
            code,
            expires_at
        ) VALUES (?, ?, ?)";

        $otp_stmt = $conn->prepare($otp_query);

        $otp_stmt->bind_param(
            "sss",
            $email,
            $otp_code,
            $expires_at
        );

        $otp_stmt->execute();

        sendOTPEmail(
            $email,
            $full_name,
            $otp_code
        );

        echo json_encode([
            'status' => 'success',
            'message' => 'Account created successfully!',
            'redirect' => 'verify.html',
            'user_id' => $user_id
        ]);

    } else {

        echo json_encode([
            'status' => 'error',
            'message' => 'Registration failed. Please try again.'
        ]);
    }

    $insert_stmt->close();
}

function handleLogin($conn) {

    $secret = "0x4AAAAAADXAa4N4yAix9K_ug86PiBvPVm8";

    $token = $_POST['cf-turnstile-response'] ?? '';

    if (empty($token)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Please complete the captcha'
        ]);
        exit();
    }

    $data = [
        'secret' => $secret,
        'response' => $token,
        'remoteip' => $_SERVER['REMOTE_ADDR']
    ];

    $options = [
        'http' => [
            'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
            'method'  => 'POST',
            'content' => http_build_query($data)
        ]
    ];

    $context = stream_context_create($options);

    $result = file_get_contents(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        false,
        $context
    );

    $response = json_decode($result);

    if (!$response || !$response->success) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Captcha verification failed'
        ]);
        exit();
    }

    $identifier = isset($_POST['identifier']) ? trim($_POST['identifier']) : '';
    $password = isset($_POST['password']) ? $_POST['password'] : '';

    if (empty($identifier) || empty($password)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'All fields are required'
        ]);
        exit();
    }

    $user_query = "SELECT id, username, email, full_name, password, usertype, is_verified, is_Ban, profile_picture 
                   FROM users 
                   WHERE username = ? OR email = ?";

    $user_stmt = $conn->prepare($user_query);

    $user_stmt->bind_param("ss", $identifier, $identifier);

    $user_stmt->execute();

    $user_result = $user_stmt->get_result();

    if ($user_result->num_rows === 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email/username or password'
        ]);
        exit();
    }

    $user = $user_result->fetch_assoc();

    if ($user['is_Ban'] == 1) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Your account has been banned'
        ]);
        exit();
    }

    if (empty($user['password'])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'This account uses Google sign-in. Please login with Google.'
        ]);
        exit();
    }

    if (!password_verify($password, $user['password'])) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email/username or password'
        ]);
        exit();
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['usertype'] = $user['usertype'];
    $_SESSION['is_verified'] = $user['is_verified'];
    $_SESSION['profile_picture'] = $user['profile_picture'];

    if ($user['is_verified'] == 1) {

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful!',
            'redirect' => 'index.html'
        ]);

    } else {

        $otp_code = generateOTP();

        $expires_at = date(
            'Y-m-d H:i:s',
            strtotime('+5 minutes')
        );

        $otp_query = "INSERT INTO otp_codes 
                     (email, code, expires_at) 
                     VALUES (?, ?, ?)";

        $otp_stmt = $conn->prepare($otp_query);

        $otp_stmt->bind_param(
            "sss",
            $user['email'],
            $otp_code,
            $expires_at
        );

        $otp_stmt->execute();

        sendOTPEmail(
            $user['email'],
            $user['full_name'],
            $otp_code
        );

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful! Please verify your account.',
            'redirect' => 'verify.html'
        ]);
    }
}

function handleForgotPassword($conn) {
    $step = isset($_POST['step']) ? $_POST['step'] : '';

    switch ($step) {
        case 'send_otp':
            $email = isset($_POST['email']) ? trim($_POST['email']) : '';
            if (empty($email)) {
                echo json_encode(['status' => 'error', 'message' => 'Email is required']);
                exit();
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid email address']);
                exit();
            }

            $user_query = "SELECT id, full_name FROM users WHERE email = ?";
            $user_stmt = $conn->prepare($user_query);
            $user_stmt->bind_param("s", $email);
            $user_stmt->execute();
            $user_result = $user_stmt->get_result();

            if ($user_result->num_rows === 0) {
                echo json_encode(['status' => 'error', 'message' => 'No account found with this email']);
                exit();
            }

            $user = $user_result->fetch_assoc();

            $delete_old = "UPDATE otp_codes SET used = 1 WHERE email = ? AND used = 0";
            $delete_stmt = $conn->prepare($delete_old);
            $delete_stmt->bind_param("s", $email);
            $delete_stmt->execute();

            $otp_code = generateOTP();
            $expires_at = date('Y-m-d H:i:s', strtotime('+5 minutes'));
            $otp_query = "INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, ?)";
            $otp_stmt = $conn->prepare($otp_query);
            $otp_stmt->bind_param("sss", $email, $otp_code, $expires_at);
            $otp_stmt->execute();

            sendPasswordResetEmail($email, $user['full_name'], $otp_code);

            echo json_encode(['status' => 'success', 'message' => 'Verification code sent to your email']);
            break;

        case 'verify_otp':
            $email = isset($_POST['email']) ? trim($_POST['email']) : '';
            $otp_code = isset($_POST['otp_code']) ? trim($_POST['otp_code']) : '';

            if (empty($email) || empty($otp_code)) {
                echo json_encode(['status' => 'error', 'message' => 'Email and code are required']);
                exit();
            }

            $check_query = "SELECT id FROM otp_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1";
            $check_stmt = $conn->prepare($check_query);
            $check_stmt->bind_param("ss", $email, $otp_code);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();

            if ($check_result->num_rows === 0) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid or expired verification code']);
                exit();
            }

            $otp_data = $check_result->fetch_assoc();
            $mark_used = "UPDATE otp_codes SET used = 1 WHERE id = ?";
            $mark_stmt = $conn->prepare($mark_used);
            $mark_stmt->bind_param("i", $otp_data['id']);
            $mark_stmt->execute();

            $_SESSION['reset_email'] = $email;
            $_SESSION['reset_verified'] = true;

            echo json_encode(['status' => 'success', 'message' => 'Code verified']);
            break;

        case 'reset_password':
            $email = isset($_POST['email']) ? trim($_POST['email']) : '';
            $new_password = isset($_POST['new_password']) ? $_POST['new_password'] : '';
            $confirm_password = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';

            if (empty($email) || empty($new_password) || empty($confirm_password)) {
                echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
                exit();
            }
            if (strlen($new_password) < 6) {
                echo json_encode(['status' => 'error', 'message' => 'Password must be at least 6 characters']);
                exit();
            }
            if ($new_password !== $confirm_password) {
                echo json_encode(['status' => 'error', 'message' => 'Passwords do not match']);
                exit();
            }
            if (!isset($_SESSION['reset_email']) || $_SESSION['reset_email'] !== $email || !isset($_SESSION['reset_verified'])) {
                echo json_encode(['status' => 'error', 'message' => 'Please verify your email first']);
                exit();
            }

            $hashed_password = password_hash($new_password, PASSWORD_ARGON2ID);
            $update_query = "UPDATE users SET password = ? WHERE email = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bind_param("ss", $hashed_password, $email);
            $update_stmt->execute();

            unset($_SESSION['reset_email']);
            unset($_SESSION['reset_verified']);

            echo json_encode(['status' => 'success', 'message' => 'Password reset successfully']);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid step']);
            break;
    }
}

function handleUpdateTheme($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }
    $is_dark = isset($_POST['is_dark']) ? intval($_POST['is_dark']) : 0;
    $update_query = "UPDATE users SET is_dark = ? WHERE id = ?";
    $update_stmt = $conn->prepare($update_query);
    $update_stmt->bind_param("ii", $is_dark, $_SESSION['user_id']);
    $update_stmt->execute();
    $_SESSION['is_dark'] = $is_dark;
    echo json_encode(['status' => 'success', 'message' => 'Theme updated']);
}

function handleUpdateAccount($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }
    
    $username = isset($_POST['username']) ? trim($_POST['username']) : '';
    $full_name = isset($_POST['full_name']) ? trim($_POST['full_name']) : '';
    $current_password = isset($_POST['current_password']) ? $_POST['current_password'] : '';
    $new_password = isset($_POST['password']) ? $_POST['password'] : '';
    
    if (empty($username) || empty($full_name)) {
        echo json_encode(['status' => 'error', 'message' => 'Username and full name are required']);
        exit();
    }
    
    if (empty($current_password)) {
        echo json_encode(['status' => 'error', 'message' => 'Current password is required to save changes']);
        exit();
    }
    
    $user_query = "SELECT password FROM users WHERE id = ?";
    $user_stmt = $conn->prepare($user_query);
    $user_stmt->bind_param("i", $_SESSION['user_id']);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_data = $user_result->fetch_assoc();
    
    if (!password_verify($current_password, $user_data['password'])) {
        echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect']);
        exit();
    }
    
    $check_username = "SELECT id FROM users WHERE username = ? AND id != ?";
    $check_stmt = $conn->prepare($check_username);
    $check_stmt->bind_param("si", $username, $_SESSION['user_id']);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if ($check_result->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Username already taken']);
        exit();
    }
    
    $profile_pic = null;
    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../media/profile_picture/';
        if (!is_dir($upload_dir)) { mkdir($upload_dir, 0755, true); }
        $ext = strtolower(pathinfo($_FILES['profile_picture']['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp'];
        if (in_array($ext, $allowed)) {
            $safe = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $full_name));
            $filename = $safe . '_' . time() . '.' . $ext;
            move_uploaded_file($_FILES['profile_picture']['tmp_name'], $upload_dir . $filename);
            $profile_pic = $filename;
        }
    }
    
    if ($profile_pic) {
        $sql = "UPDATE users SET username = ?, full_name = ?, profile_picture = ?";
        $types = "sss";
        $params = [$username, $full_name, $profile_pic];
    } else {
        $sql = "UPDATE users SET username = ?, full_name = ?";
        $types = "ss";
        $params = [$username, $full_name];
    }
    
    if (!empty($new_password)) {
        if (strlen($new_password) < 6) {
            echo json_encode(['status' => 'error', 'message' => 'New password must be at least 6 characters']);
            exit();
        }
        $hashed = password_hash($new_password, PASSWORD_ARGON2ID);
        $sql .= ", password = ?";
        $types .= "s";
        $params[] = $hashed;
    }
    
    $sql .= " WHERE id = ?";
    $types .= "i";
    $params[] = $_SESSION['user_id'];
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $_SESSION['username'] = $username;
        $_SESSION['full_name'] = $full_name;
        if ($profile_pic) {
            $_SESSION['profile_picture'] = $profile_pic;
        }
        echo json_encode(['status' => 'success', 'message' => 'Account updated successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update account']);
    }
}

$conn->close();
?>