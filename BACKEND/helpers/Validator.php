<?php
/**
 * Validation Helper
 * Provides data validation functions for API requests
 */

class Validator {
    private $errors = [];
    private $data = [];
    
    /**
     * Constructor
     * 
     * @param array $data The data to validate (usually $_POST or JSON input)
     */
    public function __construct($data = []) {
        $this->data = $data;
    }
    
    /**
     * Validate required fields
     * 
     * @param array $fields List of required field names
     * @return Validator
     */
    public function required($fields) {
        $fields = is_array($fields) ? $fields : [$fields];
        foreach ($fields as $field) {
            if (!isset($this->data[$field]) || $this->data[$field] === '' || $this->data[$field] === null) {
                $this->errors[$field][] = ucfirst($field) . ' is required';
            }
        }
        return $this;
    }
    
    /**
     * Validate email
     * 
     * @param string $field Field name
     * @return Validator
     */
    public function email($field) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
                $this->errors[$field][] = 'Invalid email address';
            }
        }
        return $this;
    }
    
    /**
     * Validate string length
     * 
     * @param string $field Field name
     * @param int $min Minimum length
     * @param int|null $max Maximum length (optional)
     * @return Validator
     */
    public function length($field, $min = 0, $max = null) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $length = strlen($this->data[$field]);
            if ($length < $min) {
                $this->errors[$field][] = ucfirst($field) . " must be at least $min characters";
            }
            if ($max !== null && $length > $max) {
                $this->errors[$field][] = ucfirst($field) . " must not exceed $max characters";
            }
        }
        return $this;
    }
    
    /**
     * Validate numeric
     * 
     * @param string $field Field name
     * @param float|null $min Minimum value
     * @param float|null $max Maximum value
     * @return Validator
     */
    public function numeric($field, $min = null, $max = null) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!is_numeric($this->data[$field])) {
                $this->errors[$field][] = ucfirst($field) . ' must be a number';
            } else {
                $value = (float)$this->data[$field];
                if ($min !== null && $value < $min) {
                    $this->errors[$field][] = ucfirst($field) . " must be at least $min";
                }
                if ($max !== null && $value > $max) {
                    $this->errors[$field][] = ucfirst($field) . " must not exceed $max";
                }
            }
        }
        return $this;
    }
    
    /**
     * Validate integer
     * 
     * @param string $field Field name
     * @param int|null $min Minimum value
     * @param int|null $max Maximum value
     * @return Validator
     */
    public function integer($field, $min = null, $max = null) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!filter_var($this->data[$field], FILTER_VALIDATE_INT)) {
                $this->errors[$field][] = ucfirst($field) . ' must be an integer';
            } else {
                $value = (int)$this->data[$field];
                if ($min !== null && $value < $min) {
                    $this->errors[$field][] = ucfirst($field) . " must be at least $min";
                }
                if ($max !== null && $value > $max) {
                    $this->errors[$field][] = ucfirst($field) . " must not exceed $max";
                }
            }
        }
        return $this;
    }
    
    /**
     * Validate date
     * 
     * @param string $field Field name
     * @param string $format Date format (default: Y-m-d)
     * @return Validator
     */
    public function date($field, $format = 'Y-m-d') {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $date = \DateTime::createFromFormat($format, $this->data[$field]);
            if (!$date || $date->format($format) !== $this->data[$field]) {
                $this->errors[$field][] = 'Invalid date format. Expected: ' . $format;
            }
        }
        return $this;
    }
    
    /**
     * Validate date range
     * 
     * @param string $startField Start date field
     * @param string $endField End date field
     * @return Validator
     */
    public function dateRange($startField, $endField) {
        if (isset($this->data[$startField]) && isset($this->data[$endField])) {
            $start = strtotime($this->data[$startField]);
            $end = strtotime($this->data[$endField]);
            if ($start !== false && $end !== false && $start > $end) {
                $this->errors[$endField][] = 'End date must be after start date';
            }
        }
        return $this;
    }
    
    /**
     * Validate value is in allowed list
     * 
     * @param string $field Field name
     * @param array $allowed List of allowed values
     * @return Validator
     */
    public function in($field, $allowed) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!in_array($this->data[$field], $allowed)) {
                $this->errors[$field][] = ucfirst($field) . ' must be one of: ' . implode(', ', $allowed);
            }
        }
        return $this;
    }
    
    /**
     * Validate phone number
     * 
     * @param string $field Field name
     * @return Validator
     */
    public function phone($field) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $phone = preg_replace('/[^0-9+]/', '', $this->data[$field]);
            if (!preg_match('/^[0-9+\-() ]{7,20}$/', $this->data[$field])) {
                $this->errors[$field][] = 'Invalid phone number format';
            }
        }
        return $this;
    }
    
    /**
     * Validate URL
     * 
     * @param string $field Field name
     * @return Validator
     */
    public function url($field) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!filter_var($this->data[$field], FILTER_VALIDATE_URL)) {
                $this->errors[$field][] = 'Invalid URL';
            }
        }
        return $this;
    }
    
    /**
     * Validate boolean
     * 
     * @param string $field Field name
     * @return Validator
     */
    public function boolean($field) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            $value = $this->data[$field];
            if (!is_bool($value) && !in_array($value, ['true', 'false', '1', '0', 1, 0], true)) {
                $this->errors[$field][] = ucfirst($field) . ' must be true or false';
            }
        }
        return $this;
    }
    
    /**
     * Validate array
     * 
     * @param string $field Field name
     * @return Validator
     */
    public function array($field) {
        if (isset($this->data[$field]) && $this->data[$field] !== '') {
            if (!is_array($this->data[$field])) {
                $this->errors[$field][] = ucfirst($field) . ' must be an array';
            }
        }
        return $this;
    }
    
    /**
     * Check if validation passed
     * 
     * @return bool
     */
    public function passes() {
        return empty($this->errors);
    }
    
    /**
     * Check if validation failed
     * 
     * @return bool
     */
    public function fails() {
        return !empty($this->errors);
    }
    
    /**
     * Get all errors
     * 
     * @return array
     */
    public function getErrors() {
        return $this->errors;
    }
    
    /**
     * Get first error message for a field
     * 
     * @param string $field Field name
     * @return string|null
     */
    public function getFirstError($field) {
        if (isset($this->errors[$field]) && !empty($this->errors[$field])) {
            return $this->errors[$field][0];
        }
        return null;
    }
    
    /**
     * Get all error messages as flat array
     * 
     * @return array
     */
    public function getAllErrors() {
        $allErrors = [];
        foreach ($this->errors as $field => $messages) {
            foreach ($messages as $message) {
                $allErrors[] = $message;
            }
        }
        return $allErrors;
    }
    
    /**
     * Get validated/sanitized data
     * 
     * @param array $fields Optional fields to extract
     * @return array
     */
    public function getData($fields = null) {
        if ($fields === null) {
            return $this->data;
        }
        
        $result = [];
        foreach ($fields as $field) {
            if (isset($this->data[$field])) {
                $result[$field] = $this->data[$field];
            }
        }
        return $result;
    }
    
    /**
     * Sanitize string input
     * 
     * @param string $value
     * @return string
     */
    public static function sanitizeString($value) {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }
    
    /**
     * Sanitize email
     * 
     * @param string $value
     * @return string
     */
    public static function sanitizeEmail($value) {
        return filter_var(trim($value), FILTER_SANITIZE_EMAIL);
    }
    
    /**
     * Sanitize integer
     * 
     * @param mixed $value
     * @return int
     */
    public static function sanitizeInt($value) {
        return (int)$value;
    }
    
    /**
     * Sanitize float
     * 
     * @param mixed $value
     * @return float
     */
    public static function sanitizeFloat($value) {
        return (float)$value;
    }
}

// Helper function to validate input
function validate($data, $rules = []) {
    $validator = new Validator($data);
    // Note: You'll need to implement rule parsing or use the methods directly
    return $validator;
}

// Helper to sanitize input
function sanitize($data) {
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return Validator::sanitizeString($data);
}

// Helper to get JSON input
function getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}
?>
