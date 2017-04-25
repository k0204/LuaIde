import vscode = require('vscode');
import { ProviderUtils } from '../provider/providerUtils'
import { LuaParse } from '../LuaParse'
import * as ExFileUtils from '../ex/ExFileUtils'
import { ExtensionManager } from '../ex/ExtensionManager'
import { getFunctionParameter } from '../ex/Template/FunctionParameter'


import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';

export function createFunction(e) {

    var editor = vscode.window.activeTextEditor;
    var functionName: string = editor.document.getText(editor.selection)
    functionName = functionName.trim();
    if (functionName == null || functionName == "") {
        vscode.window.showInformationMessage("未选择方法名!")
    }
    getFunctionParameter(function (args: Array<string>) {
        if (args == null) return
        var document = editor.document;
        editor.edit(function (edit) {
            var tokens: Array<TokenInfo> = ProviderUtils.getTokens(document, editor.selection.end)
            var position: vscode.Position = null;

            if (tokens.length == 1) {

                position = new vscode.Position(tokens[0].line, 0)
            }
            var upToken: TokenInfo = null
            for (var index = tokens.length - 1; index >= 0; index--) {
                var currentToken: TokenInfo = tokens[index]
                if (currentToken.type == TokenTypes.Keyword && currentToken.value == "function") {
                    position = new vscode.Position(tokens[index].line, tokens[index].lineStart)
                    break
                }
                if (upToken) {
                    if (upToken.type == TokenTypes.Identifier) {
                        if (
                            currentToken.type == TokenTypes.Identifier ||
                            (currentToken.type == TokenTypes.Punctuator &&
                                currentToken.value == ")")
                        ) {
                            position = new vscode.Position(upToken.line, 0)
                            break
                        }
                    }
                }
                upToken = tokens[index]
            }
            var startIndex = 0
            for (var index = tokens.length - 1; index >= 0; index--) {
                if (tokens[index].type == TokenTypes.Keyword && tokens[index].value == "function") {
                    startIndex = tokens[index].range.start - 1;
                    break
                }
            }
            var startCount: number = 0
            var docText = document.getText()
            for (var index = startIndex; index >= 0; index--) {
                var char = docText.charAt(index)
                if (char == "\n") {
                    break;
                }
                startCount++
            }
            startCount += 4
            var text: string = ExtensionManager.em.templateManager.getTemplateText(1)

            // var insterText: string = text.replace("{$functionName}", functionName)
            //     .replace("{$time}", new Date().toISOString())

            var insterText: string = ExtensionManager.em.luaIdeConfigManager.replaceConfigValue(text, null)
            insterText = insterText.replace(new RegExp("{functionName}", "gm"), functionName)
            insterText = insterText + "\r\n";
            var insterTexts: Array<string> = insterText.split("\r\n")
            var lineText = ""
            var tabCount = Math.ceil(startCount / 4)
            for (var j = 0; j < tabCount; j++) {
                if (insterTexts[i] != "") {
                    lineText += "\t"
                }
            }
            for (var i = 0; i < insterTexts.length; i++) {

                if (insterTexts[i] != "{paramdesc}") {
                    insterTexts[i] = lineText + insterTexts[i].trim()
                }

            }
            insterText = "\r\n";
            var j = 0;
            for (var i = 0; i < insterTexts.length; i++) {
                if (insterTexts[i] != "") {
                    if (j == 0) {
                        insterText += insterTexts[i]
                    } else {
                        insterText += "\r\n" + insterTexts[i]
                    }
                    j++;
                }
            }
           
            var paramDescStr: string = ""
            var paramStr: string = ""
            for (var index = 0; index < args.length; index++) {
                var arg = args[index]
                paramDescStr += lineText + "--@" + arg + " \n"
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
            
            edit.insert(position, insterText)

        });

    })




}
