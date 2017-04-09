import child_process = require('child_process');
import vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var os = require('os');
export function LuaFormat(str): string {
    var extensionPath = vscode.extensions.getExtension("kangping.luaide").extensionPath
    var rootPath = path.join(extensionPath, "runtime", "win");
    var exePath = path.join(rootPath, "lua.exe");
    var scriptPath = path.join(rootPath, "temp.lua");
    var cmd: string = rootPath + " " + scriptPath;
    var options = {
        encoding: 'utf8',
        timeout: 0,
        maxBuffer: 1024 * 1024,

        cwd: rootPath,
        env: null
    };


    try {
        fs.writeFileSync(scriptPath, str);
    } catch (err) {
        return str
    }

    var luascriptPath = scriptPath.replace(/\\/g, "\\\\");
    var buff = child_process.spawnSync("lua.exe", ["-e", 'require("formatter")("' + luascriptPath + '")'], options)
    var result = buff.stdout.toString().trim();
    if(result == "complete") {
        //读取
        var contentText = fs.readFileSync(path.join(scriptPath), 'utf-8');
        return contentText
    }
    return str
}