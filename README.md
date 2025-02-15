# Mikrotik Script Extension

VS Code extension for Mikrotik script syntax highlighting and snippets.

![RouterOS Script](images/preview.gif)

## Features

- Syntax highlighting for Mikrotik script files
- Common snippets for Mikrotik commands
- Support for .rsc files
- Rich syntax highlighting for RouterOS scripts
  - Comments, variables, and keywords
  - String literals with escape sequences
  - Built-in RouterOS commands
  - Operators and control structures
- Smart function handling
  - Function navigation (Go to Definition)
  - Hover documentation
  - Find all References
  - Outline view of functions
- Intelligent code completion
  - Auto-complete global functions after typing $
  - RouterOS commands after typing :
  - Auto-closing pairs for brackets and quotes

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Mikrotik Script"
4. Click Install

## Usage

Open any .rsc file or change the language mode to "Mikrotik Script" to activate the extension.

1. Open any `.rsc` file
2. Function features:
   - Hover over functions to see documentation
   - Click on function references to navigate to definitions
   - Press F12 to go to definition
   - Press Shift+F12 to find all references
   - View functions in the Outline panel
3. Code completion:
   - Type $ to see available global functions
   - Type : to see RouterOS commands
4. Documentation format:
   ```routeros
   # Function documentation example
   # Parameters:
   #   m - HTTP method (get|post|put|delete)
   #   a - Action (update|config)
   #   b - JSON payload
   :global ispappHTTPClient do={
       # Function implementation
   }
   ```

## Requirements

- Visual Studio Code version 1.75.0 or higher
- RouterOS v6 or v7 for script compatibility

## Extension Settings

No additional settings required. The extension activates automatically for `.rsc` files.

## Known Issues

- Function detection requires proper formatting with `:global` or `:local` keywords
- Documentation must be directly above the function definition

## Release Notes

### 1.0.0
- Initial release with basic features

### 1.1.0
- Added function references lookup
- Added code completion
- Enhanced syntax highlighting
- Added outline view

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
