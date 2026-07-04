<?php
/**
 * File Upload Helper
 * Handles image uploads for profile pictures and other files
 */

class UploadHelper {
    private $uploadDir;
    private $allowedTypes;
    private $maxFileSize;
    private $errors = [];
    
    /**
     * Constructor
     * 
     * @param string $uploadDir Directory to store uploaded files (relative to project root)
     * @param array $allowedTypes Array of allowed MIME types
     * @param int $maxFileSize Maximum file size in bytes (default: 2MB)
     */
    public function __construct(
        $uploadDir = 'uploads/',
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        $maxFileSize = 2097152 // 2MB
    ) {
        $this->uploadDir = rtrim($uploadDir, '/') . '/';
        $this->allowedTypes = $allowedTypes;
        $this->maxFileSize = $maxFileSize;
        
        // Create upload directory if it doesn't exist
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }
    
    /**
     * Upload a single file
     * 
     * @param array $file The $_FILES array element
     * @param string $prefix Optional prefix for filename
     * @return array|false Returns array with file info or false on failure
     */
    public function upload($file, $prefix = '') {
        $this->errors = [];
        
        // Check if file was uploaded successfully
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            $this->errors[] = $this->getUploadErrorMessage($file['error'] ?? UPLOAD_ERR_NO_FILE);
            return false;
        }
        
        // Validate file type
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        if (!in_array($mimeType, $this->allowedTypes)) {
            $this->errors[] = 'File type not allowed. Allowed types: ' . implode(', ', $this->allowedTypes);
            return false;
        }
        
        // Validate file size
        if ($file['size'] > $this->maxFileSize) {
            $this->errors[] = 'File size exceeds limit. Maximum: ' . $this->formatFileSize($this->maxFileSize);
            return false;
        }
        
        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $prefix . time() . '_' . uniqid() . '.' . $extension;
        $fullPath = $this->uploadDir . $filename;
        
        // Move file to destination
        if (!move_uploaded_file($file['tmp_name'], $fullPath)) {
            $this->errors[] = 'Failed to move uploaded file';
            return false;
        }
        
        return [
            'filename' => $filename,
            'path' => $fullPath,
            'url' => $this->getPublicUrl($filename),
            'size' => $file['size'],
            'mime_type' => $mimeType,
            'original_name' => $file['name']
        ];
    }
    
    /**
     * Upload a profile image (resizes and optimizes)
     * 
     * @param array $file The $_FILES array element
     * @param int $userId User ID for filename
     * @param int $maxWidth Maximum width for resizing
     * @param int $maxHeight Maximum height for resizing
     * @return array|false Returns array with file info or false on failure
     */
    public function uploadProfileImage($file, $userId, $maxWidth = 300, $maxHeight = 300) {
        $this->errors = [];
        
        // First validate and upload
        $uploadResult = $this->upload($file, 'profile_' . $userId . '_');
        if (!$uploadResult) {
            return false;
        }
        
        // Resize image (if GD extension is available)
        if (function_exists('imagecreatefromjpeg') || function_exists('imagecreatefrompng')) {
            $this->resizeImage($uploadResult['path'], $maxWidth, $maxHeight);
        }
        
        return $uploadResult;
    }
    
    /**
     * Resize image to fit within dimensions
     * 
     * @param string $imagePath Path to image file
     * @param int $maxWidth Maximum width
     * @param int $maxHeight Maximum height
     * @return bool
     */
    private function resizeImage($imagePath, $maxWidth, $maxHeight) {
        $info = getimagesize($imagePath);
        if (!$info) return false;
        
        list($width, $height, $type) = $info;
        
        // Calculate new dimensions
        $ratio = min($maxWidth / $width, $maxHeight / $height, 1);
        $newWidth = round($width * $ratio);
        $newHeight = round($height * $ratio);
        
        // Create image resource
        switch ($type) {
            case IMAGETYPE_JPEG:
                $src = imagecreatefromjpeg($imagePath);
                break;
            case IMAGETYPE_PNG:
                $src = imagecreatefrompng($imagePath);
                break;
            case IMAGETYPE_GIF:
                $src = imagecreatefromgif($imagePath);
                break;
            case IMAGETYPE_WEBP:
                if (function_exists('imagecreatefromwebp')) {
                    $src = imagecreatefromwebp($imagePath);
                } else {
                    return false;
                }
                break;
            default:
                return false;
        }
        
        if (!$src) return false;
        
        // Create new image
        $dst = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG
        if ($type === IMAGETYPE_PNG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        }
        
        // Resize
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Save
        switch ($type) {
            case IMAGETYPE_JPEG:
                imagejpeg($dst, $imagePath, 85);
                break;
            case IMAGETYPE_PNG:
                imagepng($dst, $imagePath, 6);
                break;
            case IMAGETYPE_GIF:
                imagegif($dst, $imagePath);
                break;
            case IMAGETYPE_WEBP:
                if (function_exists('imagewebp')) {
                    imagewebp($dst, $imagePath, 80);
                }
                break;
        }
        
        imagedestroy($src);
        imagedestroy($dst);
        
        return true;
    }
    
    /**
     * Delete a file
     * 
     * @param string $filename Filename to delete
     * @return bool
     */
    public function delete($filename) {
        $path = $this->uploadDir . $filename;
        if (file_exists($path)) {
            return unlink($path);
        }
        return false;
    }
    
    /**
     * Get public URL for a file
     * 
     * @param string $filename
     * @return string
     */
    public function getPublicUrl($filename) {
        // Adjust base URL as needed
        $baseUrl = (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'];
        $baseUrl .= rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/';
        return $baseUrl . $this->uploadDir . $filename;
    }
    
    /**
     * Get errors
     * 
     * @return array
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * Get upload error message
     * 
     * @param int $errorCode
     * @return string
     */
    private function getUploadErrorMessage($errorCode) {
        switch ($errorCode) {
            case UPLOAD_ERR_INI_SIZE:
                return 'The uploaded file exceeds the upload_max_filesize directive in php.ini';
            case UPLOAD_ERR_FORM_SIZE:
                return 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form';
            case UPLOAD_ERR_PARTIAL:
                return 'The uploaded file was only partially uploaded';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Missing a temporary folder';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Failed to write file to disk';
            case UPLOAD_ERR_EXTENSION:
                return 'A PHP extension stopped the file upload';
            default:
                return 'Unknown upload error';
        }
    }
    
    /**
     * Format file size for display
     * 
     * @param int $bytes
     * @return string
     */
    private function formatFileSize($bytes) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}

// Helper function for quick upload
function uploadFile($file, $prefix = '') {
    $uploader = new UploadHelper();
    return $uploader->upload($file, $prefix);
}

// Helper function for profile image upload
function uploadProfileImage($file, $userId) {
    $uploader = new UploadHelper();
    return $uploader->uploadProfileImage($file, $userId);
}
?>
