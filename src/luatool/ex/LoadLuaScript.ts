import vscode = require('vscode');
var fs = require('fs');
var path = require('path');
var os = require('os')
import { ExtensionManager } from '../ex/ExtensionManager'
export function OpenLuaLuaScriptText(e) {
    var extensionPath =ExtensionManager.em.luaIdeConfigManager.extensionPath
    var srpitLuaPath = path.join(extensionPath, "Template", "LoadScript", "LoadScript.lua")
    return vscode.workspace.openTextDocument(srpitLuaPath).then(document => {

        return vscode.window.showTextDocument(document);
    }).then(editor => {

        return;
    }).then(() => {

    }, error => {
        console.log(error)
    });
}
export function LoadLuaScriptFun() {

}