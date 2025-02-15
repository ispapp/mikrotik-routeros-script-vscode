const vscode = require('vscode');

function activate(context) {
    // Function to find definition in all workspace files
    async function findDefinitionInWorkspace(funcName) {
        const files = await vscode.workspace.findFiles('**/*.rsc');
        
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                // Match both :global and :local function definitions
                const functionDefRegex = new RegExp(`:(global|local)\\s+${funcName}\\s+do=`);
                
                if (functionDefRegex.test(line.text)) {
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(i, line.text.indexOf(funcName))
                    );
                }
            }
        }
        return null;
    }

    // Add helper function to find variable definitions
    async function findVariableDefinition(varName, document) {
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const varDefRegex = new RegExp(`:(global|local)\\s+${varName}\\s*(?:\"([^\"]*)\")?`);
            const match = line.text.match(varDefRegex);
            
            if (match) {
                return {
                    location: new vscode.Location(
                        document.uri,
                        new vscode.Position(i, line.text.indexOf(varName))
                    ),
                    value: match[2] // Capture the string value if present
                };
            }
        }
        return null;
    }

    // Update the findDefinitionInWorkspace function to handle both functions and variables
    async function findDefinitionInWorkspace(name, isVariable = false) {
        const files = await vscode.workspace.findFiles('**/*.rsc');
        let functionDef = null;
        
        // First pass: look for exact function definition
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const functionDefRegex = new RegExp(`^\\s*:global\\s+${name}\\s+do=`);
                
                if (functionDefRegex.test(line.text)) {
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(i, line.text.indexOf(name))
                    );
                }
            }
        }

        // If no function definition found and it's a variable request, look for variable declarations
        if (isVariable) {
            for (const file of files) {
                const document = await vscode.workspace.openTextDocument(file);
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const patterns = [
                        new RegExp(`^\\s*:global\\s+${name}\\s*=`),
                        new RegExp(`^\\s*:set\\s+\\$${name}\\b`),
                        new RegExp(`^\\s*:set\\s+${name}\\b`)
                    ];

                    for (const pattern of patterns) {
                        if (pattern.test(line.text)) {
                            return new vscode.Location(
                                document.uri,
                                new vscode.Position(i, line.text.indexOf(name))
                            );
                        }
                    }
                }
            }
        }
        
        return null;
    }

    // Add helper function to find the first global declaration of a variable
    async function findVariableFirstDeclaration(varName) {
        const files = await vscode.workspace.findFiles('**/*.rsc');
        
        for (const file of files) {
            const document = await vscode.workspace.openTextDocument(file);
            // Look for the first global declaration of the variable
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i).text.trim();
                // Match only the initial global declaration (not assignments)
                const isGlobalDeclaration = new RegExp(`^:global\\s+${varName}\\s*;?$`).test(line);
                
                if (isGlobalDeclaration) {
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(i, line.indexOf(varName))
                    );
                }
            }
        }
        return null;
    }

    // Add helper function to find first variable declaration in current file
    async function findFirstVariableInCurrentFile(varName, document) {
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text.trim();
            // Match simple global variable declaration
            if (new RegExp(`^:global\\s+${varName}\\s*;?$`).test(line)) {
                return new vscode.Location(
                    document.uri,
                    new vscode.Position(i, line.indexOf(varName))
                );
            }
        }
        return null;
    }

    // Update the definition provider
    let definitionProvider = vscode.languages.registerDefinitionProvider(
        'routeros-script',
        {
            async provideDefinition(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) return null;
                
                let word = document.getText(wordRange);
                if (word.startsWith('$')) {
                    word = word.substring(1);
                }

                const line = document.lineAt(position.line).text;
                
                // Check if we're clicking on a function definition
                const isFunctionDef = line.match(new RegExp(`:global\\s+${word}\\s+do=`));
                if (isFunctionDef) {
                    return new vscode.Location(
                        document.uri,
                        new vscode.Position(position.line, line.indexOf(word))
                    );
                }

                // Check if this is a simple variable declaration
                const isSimpleVariable = line.match(new RegExp(`:global\\s+${word}\\s*;?$`));
                if (isSimpleVariable) {
                    // First try to find in current file
                    const currentFileDeclaration = await findFirstVariableInCurrentFile(word, document);
                    if (currentFileDeclaration) {
                        return currentFileDeclaration;
                    }
                }

                // Otherwise look for function calls or other declarations
                const isFunctionCall = line.includes(`$${word} `) || 
                                     line.includes(`$${word}(`) ||
                                     line.match(new RegExp(`\\$${word}\\s+[a-z]=`));
                
                return await findDefinitionInWorkspace(word, !isFunctionCall);
            }
        }
    );

    let hoverProvider = vscode.languages.registerHoverProvider(
        'routeros-script',
        {
            async provideHover(document, position, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) return null;
                
                let word = document.getText(wordRange);
                // Remove the $ prefix if present
                if (word.startsWith('$')) {
                    word = word.substring(1);
                }

                // Check for variable definition first
                const varDef = await findVariableDefinition(word, document);
                if (varDef && varDef.value) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`Variable value: \`${varDef.value}\``);
                    return new vscode.Hover(markdown);
                }

                const files = await vscode.workspace.findFiles('**/*.rsc');
                for (const file of files) {
                    const doc = await vscode.workspace.openTextDocument(file);
                    for (let i = 0; i < doc.lineCount; i++) {
                        const line = doc.lineAt(i);
                        const functionDefRegex = new RegExp(`:(global|local)\\s+${word}\\s+do=`);
                        
                        if (functionDefRegex.test(line.text)) {
                            let docLines = [];
                            let docIndex = i - 1;
                            
                            while (docIndex >= 0) {
                                const docLine = doc.lineAt(docIndex).text.trim();
                                if (!docLine.startsWith('#')) {
                                    break;
                                }
                                docLines.unshift(docLine.substring(1).trim());
                                docIndex--;
                            }

                            if (docLines.length > 0) {
                                const markdown = new vscode.MarkdownString();
                                markdown.appendMarkdown(`**Function Documentation** (${vscode.workspace.asRelativePath(file)}):\n\n`);
                                markdown.appendMarkdown(docLines.join('\n'));
                                return new vscode.Hover(markdown);
                            }
                        }
                    }
                }
            }
        }
    );

    // Add reference provider
    let referenceProvider = vscode.languages.registerReferenceProvider(
        'routeros-script',
        {
            async provideReferences(document, position, context, token) {
                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) return null;
                
                let word = document.getText(wordRange);
                if (word.startsWith('$')) {
                    word = word.substring(1);
                }

                const references = [];
                const files = await vscode.workspace.findFiles('**/*.rsc');
                
                // Check if we're looking at a function definition
                const currentLine = document.lineAt(position.line).text;
                const isFunctionDef = currentLine.match(new RegExp(`:(global|local)\\s+${word}\\s+do=`));
                
                // If this is a function definition, collect all usages
                if (isFunctionDef) {
                    for (const file of files) {
                        const doc = await vscode.workspace.openTextDocument(file);
                        for (let i = 0; i < doc.lineCount; i++) {
                            const line = doc.lineAt(i).text;
                            
                            // Collect function definition
                            if (line.match(new RegExp(`:(global|local)\\s+${word}\\s+do=`))) {
                                references.push(new vscode.Location(
                                    doc.uri,
                                    new vscode.Position(i, line.indexOf(word))
                                ));
                                continue;
                            }

                            // Match all possible function call patterns
                            const patterns = [
                                // Basic function call
                                new RegExp(`\\$${word}\\s+[a-z]=`, 'g'),
                                // Nested in brackets
                                new RegExp(`\\[\\s*\\$${word}\\s+[a-z]=`, 'g'),
                                // Traditional style
                                new RegExp(`\\$${word}\\(`, 'g'),
                                // Simple function reference
                                new RegExp(`\\$${word}\\b`, 'g'),
                                // Variable declaration using function
                                new RegExp(`=\\s*\\[\\s*\\$${word}\\s`, 'g'),
                                // Direct function call
                                new RegExp(`\\[\\s*\\$${word}\\s`, 'g')
                            ];

                            for (const pattern of patterns) {
                                let match;
                                while ((match = pattern.exec(line)) !== null) {
                                    // Find the actual start of the function name
                                    let nameIndex = match.index;
                                    while (nameIndex < line.length && line[nameIndex] !== word[0]) {
                                        nameIndex++;
                                    }

                                    references.push(new vscode.Location(
                                        doc.uri,
                                        new vscode.Position(i, nameIndex)
                                    ));
                                }
                            }
                        }
                    }
                }
                
                return references;
            }
        }
    );

    // Add completion provider
    let completionProvider = vscode.languages.registerCompletionItemProvider(
        'routeros-script',
        {
            async provideCompletionItems(document, position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                
                // Suggest global functions
                if (linePrefix.endsWith('$')) {
                    const completions = [];
                    const files = await vscode.workspace.findFiles('**/*.rsc');
                    
                    for (const file of files) {
                        const doc = await vscode.workspace.openTextDocument(file);
                        for (let i = 0; i < doc.lineCount; i++) {
                            const line = doc.lineAt(i).text;
                            const match = line.match(/^:global\s+(\w+)\s+do=/);
                            if (match) {
                                const completion = new vscode.CompletionItem(match[1], vscode.CompletionItemKind.Function);
                                completion.documentation = new vscode.MarkdownString(`Function defined in ${vscode.workspace.asRelativePath(file)}`);
                                completions.push(completion);
                            }
                        }
                    }
                    return completions;
                }

                // Suggest RouterOS commands
                if (linePrefix.endsWith(':')) {
                    return [
                        new vscode.CompletionItem('global', vscode.CompletionItemKind.Keyword),
                        new vscode.CompletionItem('local', vscode.CompletionItemKind.Keyword),
                        new vscode.CompletionItem('put', vscode.CompletionItemKind.Function),
                        new vscode.CompletionItem('log', vscode.CompletionItemKind.Function),
                        new vscode.CompletionItem('error', vscode.CompletionItemKind.Function),
                        // Add more RouterOS commands as needed
                    ];
                }
            }
        },
        '$', ':' // Trigger characters
    );

    // Add document symbol provider for outline view
    let symbolProvider = vscode.languages.registerDocumentSymbolProvider(
        'routeros-script',
        {
            provideDocumentSymbols(document) {
                const symbols = [];
                
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const match = line.text.match(/^:(global|local)\s+(\w+)\s+do=/);
                    
                    if (match) {
                        symbols.push(new vscode.DocumentSymbol(
                            match[2],
                            `${match[1]} function`,
                            vscode.SymbolKind.Function,
                            line.range,
                            line.range
                        ));
                    }
                }
                
                return symbols;
            }
        }
    );

    // Add signature help provider
    let signatureProvider = vscode.languages.registerSignatureHelpProvider(
        'routeros-script',
        {
            provideSignatureHelp(document, position, token, context) {
                const line = document.lineAt(position.line).text.substring(0, position.character);
                const functionCallMatch = line.match(/\$(\w+)\s*\((.*)/);
                
                if (functionCallMatch) {
                    const functionName = functionCallMatch[1];
                    const signatureHelp = new vscode.SignatureHelp();
                    const signatureInfo = new vscode.SignatureInformation(
                        `$${functionName}(param1, param2)`,
                        'Function parameters documentation'
                    );
                    signatureInfo.parameters = [
                        new vscode.ParameterInformation('param1', 'First parameter'),
                        new vscode.ParameterInformation('param2', 'Second parameter')
                    ];
                    signatureHelp.signatures = [signatureInfo];
                    signatureHelp.activeSignature = 0;
                    signatureHelp.activeParameter = functionCallMatch[2].split(',').length - 1;
                    return signatureHelp;
                }
                return null;
            }
        },
        '(', ','
    );

    // Add document formatting provider
    let formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
        'routeros-script',
        {
            provideDocumentFormattingEdits(document) {
                const edits = [];
                let indentLevel = 0;
                
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i);
                    const text = line.text.trim();
                    
                    if (text.endsWith('}')) {
                        indentLevel--;
                    }
                    
                    if (text.length > 0) {
                        const indent = ' '.repeat(indentLevel * 4);
                        edits.push(vscode.TextEdit.replace(line.range, indent + text));
                    }
                    
                    if (text.endsWith('do={')) {
                        indentLevel++;
                    }
                }
                return edits;
            }
        }
    );

    // Add folding range provider
    let foldingProvider = vscode.languages.registerFoldingRangeProvider(
        'routeros-script',
        {
            provideFoldingRanges(document) {
                const ranges = [];
                let startLine = null;
                
                for (let i = 0; i < document.lineCount; i++) {
                    const line = document.lineAt(i).text.trim();
                    
                    if (line.endsWith('do={')) {
                        startLine = i;
                    } else if (line === '}' && startLine !== null) {
                        ranges.push(new vscode.FoldingRange(startLine, i));
                        startLine = null;
                    }
                }
                return ranges;
            }
        }
    );

    // Add diagnostics provider
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('routeros-script');
    
    function updateDiagnostics(document) {
        // Clear any existing diagnostics
        diagnosticCollection.clear();
    }

    // Register diagnostic events
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            updateDiagnostics(event.document);
        }),
        vscode.workspace.onDidOpenTextDocument(document => {
            updateDiagnostics(document);
        })
    );

    context.subscriptions.push(
        definitionProvider,
        hoverProvider,
        referenceProvider,
        completionProvider,
        symbolProvider,
        signatureProvider,
        formattingProvider,
        foldingProvider,
        diagnosticCollection
    );
}

exports.activate = activate;

function deactivate() {}
exports.deactivate = deactivate;
