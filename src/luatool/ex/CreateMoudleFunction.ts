import vscode = require('vscode');
import { ProviderUtils } from '../provider/providerUtils'
import { LuaParse } from '../LuaParse'
import * as ExFileUtils from '../ex/ExFileUtils'
import { ExtensionManager } from '../ex/ExtensionManager'
import { getFunctionParameter } from '../ex/Template/FunctionParameter'

import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
export function createModuleFunction(e) {
    var editor = vscode.window.activeTextEditor;
    var functionName: string = editor.document.getText(editor.selection)
    if (functionName == null || functionName == "") {
        vscode.window.showInformationMessage("未选择方法名!")
    }

    var document = editor.document;

    var tokens: Array<TokenInfo> = ProviderUtils.getTokens(document, editor.selection.end)
    var moduleInfo = null;
    var startTokenIndex = 0
    var moduleName = null;
    if (tokens.length > 0) {
        moduleInfo = ProviderUtils.getSelfToModuleNameAndStartTokenIndex(document.uri, tokens, LuaParse.lp)
        if (moduleInfo != null) {
            moduleName = moduleInfo.moduleName
            startTokenIndex = moduleInfo.index
        } else {
            moduleInfo = {}
        }
    } else {
        moduleInfo = {}
    }
    var range: vscode.Range = moduleInfo.range;
    if (moduleName && moduleName != "") {
        inputFunctionName(editor, tokens, startTokenIndex, moduleName, range, functionName)
    } else {
        inputModuleName(editor, tokens, startTokenIndex, range, functionName)
    }
}
function inputModuleName(editor: vscode.TextEditor, tokens: Array<TokenInfo>, startTokenIndex: number, range: vscode.Range, functionName) {
    vscode.window.showInputBox({ prompt: "moduleName" }).then(moduleName => {
        moduleName = moduleName.trim();
        if (moduleName != "") {
            inputFunctionName(editor, tokens, startTokenIndex, moduleName, range, functionName);
        } else {
            inputModuleName(editor, tokens, startTokenIndex, range, functionName)
        }
    });
}
function inputFunctionName(editor: vscode.TextEditor, tokens: Array<TokenInfo>, startTokenIndex: number, moduleName: string, range: vscode.Range, functionName: string) {

    getFunctionParameter(function (args: Array<string>) {
        if (args == null) return
        editor.edit(function (edit) {
            var position: vscode.Position = null;
            if (range != null) {
                position = new vscode.Position(range.end.line, range.end.character)

            } else {
                if (tokens.length == 0) {
                    position = editor.selection.start;
                }
                else {
                    var token: TokenInfo = tokens[startTokenIndex]
                    if (token.comments.length == 0) {
                        position = new vscode.Position(tokens[startTokenIndex].line - 1, tokens[startTokenIndex].lineStart)

                    }
                    else {
                        var luaComment: LuaComment = token.comments[0]
                        position = new vscode.Position(luaComment.range.start.line, 0)
                    }
                }
            }


            var text: string = ExtensionManager.em.templateManager.getTemplateText(0)

            // var insterText: string = text.replace("${moduleName}", moduleName).
            //     replace("${functionName}", functionName)
            //     .replace("${time}", new Date().toISOString())

            var insterText: string = ExtensionManager.em.luaIdeConfigManager.replaceConfigValue(text, moduleName)
            insterText = insterText.replace(new RegExp("{functionName}", "gm"), functionName)

            var paramDescStr: string = ""
            var paramStr: string = ""
            for (var index = 0; index < args.length; index++) {
                var arg = args[index]
                paramDescStr += "--@" + arg + " \n"
                paramStr += arg + " ,"
            }
            paramStr = paramStr.substring(0, paramStr.length - 2)
            paramDescStr = paramDescStr.substring(0, paramDescStr.length - 2)
             if(paramDescStr == ""){
               
                insterText = insterText.replace("{paramdesc}\r\n","")
            }else
            {
                insterText = insterText.replace(new RegExp("{paramdesc}", "gm"), paramDescStr)
            }
            insterText = insterText.replace(new RegExp("{param}", "gm"), paramStr)
            edit.insert(position,
                "\r\n" + insterText + "\r\n")
            range = new vscode.Range(position, position)
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter)

        });
    })


}