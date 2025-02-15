# Test function with full documentation
:local example "adf";
# Parameters:
#   param1 - First parameter description
#   param2 - Second parameter description
# Returns:
#   Description of return value
:global testFunction do={
    :local result
    :put "Testing function"
    :return $result
}

# Using features demonstration
:local example do={
    # String highlighting
    :local str "Hello \"World\""
    
    # Built-in commands
    :put "Testing"
    :log info "Log message"
    
    # Function call with completion
    $testFunction param1="test" param2="demo"
    
    # Operators
    :if ($x > 0 and $y < 10) do={
        :return true
    }
}
