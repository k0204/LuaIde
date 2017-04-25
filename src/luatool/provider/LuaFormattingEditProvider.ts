import vscode = require('vscode');
import child_process = require('child_process');
import { LuaParse } from '../LuaParse'
import { LuaFormatParseTool } from "./format/LuaFormatParseTool"
import { LuaFormat } from "./format/LuaFormatChildProcess"

var path = require('path');
var fs = require('fs');
var os = require('os');
export class LuaFormattingEditProvider implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {


    public provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {

        return this.provideDocumentRangeFormattingEdits(document, null, options, token);
    }

    public provideDocumentRangeFormattingEdits(document: vscode.TextDocument, range: vscode.Range, options: vscode.FormattingOptions, token: vscode.CancellationToken): Thenable<vscode.TextEdit[]> {
        if (range === null) {
            var start = new vscode.Position(0, 0);
            var end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            range = new vscode.Range(start, end);
        }
        var content = document.getText(range);
        var result = [];

        content = this.format(content)
        result.push(new vscode.TextEdit(range, content))
        return Promise.resolve(result)
    }


    private format(content: string): string {
        //    return LuaFormat(content)
        var luaFormatParseTool: LuaFormatParseTool = new LuaFormatParseTool(content)
        return luaFormatParseTool.formatComent
      
    }

}
