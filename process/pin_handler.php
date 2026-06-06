<?php
session_start();
require_once '../config/database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

$action = isset($_POST['action']) ? $_POST['action'] : '';

switch ($action) {
    case 'submit_pin':
        handleSubmitPin($conn);
        break;
    case 'fetch_pins':
        handleFetchPins($conn);
        break;
    case 'fetch_user_pins':
        handleFetchUserPins($conn);
        break;
    case 'update_pin':
        handleUpdatePin($conn);
        break;
    case 'delete_pin':
        handleDeletePin($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
        break;
}

function handleSubmitPin($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    $lat = isset($_POST['lat']) ? floatval($_POST['lat']) : 0;
    $lng = isset($_POST['lng']) ? floatval($_POST['lng']) : 0;
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';
    $anonymous = isset($_POST['anonymous']) ? intval($_POST['anonymous']) : 0;

    if (empty($address) || empty($description) || $lat == 0 || $lng == 0) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
        exit();
    }

    $user_query = "SELECT full_name FROM users WHERE id = ?";
    $user_stmt = $conn->prepare($user_query);
    $user_stmt->bind_param("i", $user_id);
    $user_stmt->execute();
    $user_result = $user_stmt->get_result();
    $user_data = $user_result->fetch_assoc();
    $full_name = $user_data ? $user_data['full_name'] : 'unknown';
    $safe_name = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $full_name));
    $user_stmt->close();

    $insert_query = "INSERT INTO pins (user_id, lat, lng, address, description, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())";
    $insert_stmt = $conn->prepare($insert_query);
    $insert_stmt->bind_param("iddssi", $user_id, $lat, $lng, $address, $description, $anonymous);

    if ($insert_stmt->execute()) {
        $pin_id = $conn->insert_id;
        $evidence_paths = [];

        if (isset($_FILES['evidence']) && !empty($_FILES['evidence']['name'][0])) {
            $upload_dir = __DIR__ . '/../media/evidence/';
            
            if (!is_dir($upload_dir)) {
                mkdir($upload_dir, 0755, true);
            }
            
            $file_count = count($_FILES['evidence']['name']);
            
            if ($file_count > 5) {
                $delete_query = "DELETE FROM pins WHERE id = ?";
                $delete_stmt = $conn->prepare($delete_query);
                $delete_stmt->bind_param("i", $pin_id);
                $delete_stmt->execute();
                echo json_encode(['status' => 'error', 'message' => 'Maximum 5 photos allowed']);
                exit();
            }
            
            for ($i = 0; $i < $file_count; $i++) {
                $file_name = $_FILES['evidence']['name'][$i];
                $file_tmp = $_FILES['evidence']['tmp_name'][$i];
                $file_size = $_FILES['evidence']['size'][$i];
                $file_error = $_FILES['evidence']['error'][$i];
                
                if ($file_error === UPLOAD_ERR_OK) {
                    $max_size = 5 * 1024 * 1024;
                    if ($file_size > $max_size) {
                        continue;
                    }
                    
                    $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
                    $allowed_exts = ['jpg', 'jpeg', 'png', 'webp'];
                    
                    if (!in_array($file_ext, $allowed_exts)) {
                        continue;
                    }
                    
                    $counter = $i + 1;
                    $new_file_name = 'evidence_' . $safe_name . '_' . $pin_id . '_' . $counter . '.' . $file_ext;
                    $destination = $upload_dir . $new_file_name;
                    
                    if (move_uploaded_file($file_tmp, $destination)) {
                        $evidence_paths[] = 'media/evidence/' . $new_file_name;
                    }
                }
            }

            $evidence_json = !empty($evidence_paths) ? json_encode($evidence_paths) : null;
            
            $update_query = "UPDATE pins SET evidence = ? WHERE id = ?";
            $update_stmt = $conn->prepare($update_query);
            $update_stmt->bind_param("si", $evidence_json, $pin_id);
            $update_stmt->execute();
            $update_stmt->close();
        }

        echo json_encode([
        'status' => 'success',
        'message' => 'Report submitted successfully!',
       'pin_id' => $pin_id,
        'pin' => [
        'id' => $pin_id,
        'lat' => $lat,
        'lng' => $lng,
        'address' => $address,
        'description' => $description,
        'evidence' => $evidence_paths,
        'is_anonymous' => $anonymous,
        'status' => 'pending',
        'created_at' => date('Y-m-d H:i:s'),
        'full_name' => $anonymous ? 'Anonymous' : $full_name,
        'profile_picture' => null
    ]
]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to submit report']);
    }

    $insert_stmt->close();
}

function handleFetchPins($conn) {
    $query = "SELECT 
        p.id, p.user_id, p.lat, p.lng, p.address, p.description, 
        p.evidence, p.is_anonymous, p.status, p.created_at, p.feedback,
        u.username, u.full_name, u.profile_picture 
    FROM pins p 
    JOIN users u ON p.user_id = u.id 
    ORDER BY p.created_at DESC";

    $result = $conn->query($query);
    
    $pins = [];
    while ($row = $result->fetch_assoc()) {
        $row['evidence'] = $row['evidence'] ? json_decode($row['evidence'], true) : [];
        $pins[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'pins' => $pins
    ]);
}

function handleFetchUserPins($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }
    
    $user_id = $_SESSION['user_id'];
    
    $query = "SELECT 
        p.id, p.user_id, p.lat, p.lng, p.address, p.description, 
        p.evidence, p.is_anonymous, p.status, p.created_at, p.feedback,
        u.username, u.full_name, u.profile_picture 
    FROM pins p 
    JOIN users u ON p.user_id = u.id 
    WHERE p.user_id = ?
    ORDER BY p.created_at DESC";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $pins = [];
    while ($row = $result->fetch_assoc()) {
        $row['evidence'] = $row['evidence'] ? json_decode($row['evidence'], true) : [];
        $pins[] = $row;
    }
    
    $stmt->close();
    
    echo json_encode([
        'status' => 'success',
        'pins' => $pins
    ]);
}

function handleUpdatePin($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    $pin_id = isset($_POST['pin_id']) ? intval($_POST['pin_id']) : 0;
    $address = isset($_POST['address']) ? trim($_POST['address']) : '';
    $description = isset($_POST['description']) ? trim($_POST['description']) : '';

    if (!$pin_id || empty($address) || empty($description)) {
        echo json_encode(['status' => 'error', 'message' => 'All fields are required']);
        exit();
    }

    $check_query = "SELECT user_id, evidence FROM pins WHERE id = ?";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bind_param("i", $pin_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    $pin = $check_result->fetch_assoc();
    $check_stmt->close();

    if (!$pin || $pin['user_id'] != $user_id) {
        echo json_encode(['status' => 'error', 'message' => 'You can only edit your own reports']);
        exit();
    }

    $oldEvidence = [];
    if (!empty($pin['evidence'])) {
        $decodedEvidence = json_decode($pin['evidence'], true);
        if (is_array($decodedEvidence)) {
            $oldEvidence = $decodedEvidence;
        }
    }

    $targetEvidence = $oldEvidence;
    if (isset($_POST['evidence_json']) && $_POST['evidence_json'] !== '') {
        $decoded = json_decode($_POST['evidence_json'], true);
        if (is_array($decoded)) {
            $targetEvidence = $decoded;
        }
    }

    $removedEvidence = [];
    if (isset($_POST['removed_evidence']) && $_POST['removed_evidence'] !== '') {
        $decoded = json_decode($_POST['removed_evidence'], true);
        if (is_array($decoded)) {
            $removedEvidence = $decoded;
        }
    }

    if (!empty($removedEvidence)) {
        $targetEvidence = array_values(array_diff($targetEvidence, $removedEvidence));
    }

    $newEvidencePaths = [];
    if (isset($_FILES['evidence']) && !empty($_FILES['evidence']['name'][0])) {
        $upload_dir = __DIR__ . '/../media/evidence/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }

        $file_count = count($_FILES['evidence']['name']);
        if (count($targetEvidence) + $file_count > 5) {
            echo json_encode(['status' => 'error', 'message' => 'Maximum 5 photos allowed']);
            exit();
        }

        for ($i = 0; $i < $file_count; $i++) {
            $file_name = $_FILES['evidence']['name'][$i];
            $file_tmp = $_FILES['evidence']['tmp_name'][$i];
            $file_size = $_FILES['evidence']['size'][$i];
            $file_error = $_FILES['evidence']['error'][$i];

            if ($file_error === UPLOAD_ERR_OK) {
                $max_size = 5 * 1024 * 1024;
                if ($file_size > $max_size) {
                    continue;
                }

                $file_ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
                $allowed_exts = ['jpg', 'jpeg', 'png', 'webp'];
                if (!in_array($file_ext, $allowed_exts)) {
                    continue;
                }

                $new_file_name = 'evidence_' . $pin_id . '_' . uniqid() . '.' . $file_ext;
                $destination = $upload_dir . $new_file_name;

                if (move_uploaded_file($file_tmp, $destination)) {
                    $newEvidencePaths[] = 'media/evidence/' . $new_file_name;
                }
            }
        }
    }

    $finalEvidence = $targetEvidence;
    if (!empty($newEvidencePaths)) {
        $finalEvidence = array_merge($finalEvidence, $newEvidencePaths);
    }

    if (count($finalEvidence) > 5) {
        echo json_encode(['status' => 'error', 'message' => 'Maximum 5 photos allowed']);
        exit();
    }

    if (!empty($removedEvidence)) {
        foreach ($removedEvidence as $file) {
            $file_path = __DIR__ . '/../' . $file;
            if (file_exists($file_path)) {
                unlink($file_path);
            }
        }
    }

    $evidence_json = !empty($finalEvidence) ? json_encode($finalEvidence) : null;
    $update_query = "UPDATE pins SET address = ?, description = ?, evidence = ? WHERE id = ?";
    $update_stmt = $conn->prepare($update_query);
    $update_stmt->bind_param("sssi", $address, $description, $evidence_json, $pin_id);

    if ($update_stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Report updated successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update report']);
    }
    $update_stmt->close();
}

function handleDeletePin($conn) {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Please login first']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    $pin_id = isset($_POST['pin_id']) ? intval($_POST['pin_id']) : 0;

    if (!$pin_id) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid pin ID']);
        exit();
    }

    $check_query = "SELECT user_id, evidence FROM pins WHERE id = ?";
    $check_stmt = $conn->prepare($check_query);
    $check_stmt->bind_param("i", $pin_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    $pin = $check_result->fetch_assoc();
    $check_stmt->close();

    if (!$pin || $pin['user_id'] != $user_id) {
        echo json_encode(['status' => 'error', 'message' => 'You can only delete your own reports']);
        exit();
    }

    if ($pin['evidence']) {
        $evidence_files = json_decode($pin['evidence'], true);
        if (is_array($evidence_files)) {
            foreach ($evidence_files as $file) {
                $file_path = __DIR__ . '/../' . $file;
                if (file_exists($file_path)) {
                    unlink($file_path);
                }
            }
        }
    }

    $delete_query = "DELETE FROM pins WHERE id = ?";
    $delete_stmt = $conn->prepare($delete_query);
    $delete_stmt->bind_param("i", $pin_id);

    if ($delete_stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Report deleted successfully']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete report']);
    }
    $delete_stmt->close();
}

$conn->close();
?>