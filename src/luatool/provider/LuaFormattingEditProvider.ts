import vscode = require('vscode');
import child_process = require('child_process');
import {LuaParse} from '../LuaParse'
import {LuaFormatParseTool} from "./format/LuaFormatParseTool"
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
        result.push(new vscode.TextEdit(range,content))
       return Promise.resolve(result)
    }


    private format(content: string) {

        var luaFormatParseTool:LuaFormatParseTool = new LuaFormatParseTool(content)
        return luaFormatParseTool.formatComent
        // var extensionPath = vscode.extensions.getExtension("kangping.luaide").extensionPath;
        // var luaexePath = path.join(extensionPath, 'runtime','win','lua.exe')
        // var luaFormatPath = path.join(extensionPath, 'LuaFormat') 
        // var exeLuaPath = path.join(extensionPath, 'LuaFormat','format.lua')
        // var tempLuaPath = path.join(extensionPath, 'LuaFormat',"temp.lua")
        // var runLuaPath = path.join(extensionPath, 'LuaFormat',"main.lua")
        // luaFormatPath = luaFormatPath.replace(/\\/g, "//");
        // var tempLuaPath1 = tempLuaPath.replace(/\\/g, "//");
        // var createLuaStr ='package.path = package.path .. ";'+luaFormatPath+'//?.lua" \nrequire("format")'
        // createLuaStr += '\nlocal content = io.open("'+ tempLuaPath1 +'", "r"):read("*a") '
        // createLuaStr += '\nprint(format(content))'
        // fs.writeFileSync(runLuaPath, createLuaStr);
        // try {
        //     fs.writeFileSync(tempLuaPath, content);
        //     var os = process.platform;
        //     var buffer:Buffer;
        //     if (os == "linux") {

        //     } else if (os == "darwin") {
        //         buffer = child_process.execFileSync(luaexePath, [runLuaPath]);
        //     } else if (os == "win32") {
        //         buffer = child_process.execFileSync(luaexePath, [runLuaPath]);

        //     }
           
        //     var isWait:boolean = true 
        //    var content = buffer.toString("utf8")
        //    return content;
            // luaStartProc.stderr.setEncoding('utf8');
            // luaStartProc.stderr.on('error', error => {
            //     console.log(error)

            // });
            
            // //关闭事件
            // luaStartProc.on('close', function (code) {
            //     console.log("luaideclose")
            //     isWait = false

               
            // });
            // luaStartProc.stdout.on('data', d => {
            //     console.log(d)
            // });

            // while(isWait)
            // {
            //     console.log("wait")
            // }
          



        // } catch (err) {

        // }




    }

}
