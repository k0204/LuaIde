
'use strict';

import vscode = require('vscode');
import {LuaParse} from '../LuaParse'
import {LuaParseTool} from '../LuaParseTool'
import {LuaFiledCompletionInfo} from "../provider/LuaFiledCompletionInfo"
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';
import {CLog,getSelfToModuleName} from '../Utils'


export class LuaCompletionItemProvider implements vscode.CompletionItemProvider {


    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        return this.provideCompletionItemsInternal(document, position, token, vscode.workspace.getConfiguration('lua'));
    }

    public provideCompletionItemsInternal(document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        config: vscode.WorkspaceConfiguration): Thenable<vscode.CompletionItem[]> {
            
        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
            let filename = document.fileName;
            let lineText = document.lineAt(position.line).text;
            let lineTillCurrentPosition = lineText.substr(0, position.character);
            var suggestions:Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            var infos= this.getCurrentStrInfo(document, position)
            if(infos == null) return[]
            var functionitem:Array<LuaFiledCompletionInfo> = LuaParse.lp.luaInfoManager.getFunctionCompletionItems(
                document.uri,infos[0])
            if (functionitem == null) return resolve([])
            functionitem.forEach(element => {
           
           
                   suggestions.push(element)
            
            });
          functionitem = LuaParse.lp.luaInfoManager.getFunctionArgs(infos[1],document.uri)
         
            functionitem.forEach(element => {
                suggestions.push(element)
            });
            return resolve(suggestions);
        })

    }
    

    public getCurrentStrInfo(
        document: vscode.TextDocument,
        position: vscode.Position): any {
        var lp: LuaParse = LuaParse.lp;
        var start: vscode.Position = new vscode.Position(0, 0)
        var lpt: LuaParseTool = LuaParse.lp.lpt;
        var tokens: Array<TokenInfo> = new Array<TokenInfo>();
        lpt.Reset(document.getText(new vscode.Range(start, position)))
        while (true) {
          CLog();
            var token: TokenInfo = lpt.lex();
            if (token.error != null) {
                return;
            }
            if (token.type == TokenTypes.EOF) {
                break;
            }
            token.index = tokens.length;
            tokens.push(token);
        }
        //console.log("current:"+ tokens[tokens.length-1].value);

        var index: number = tokens.length - 1;
        var _GNumber: number = 0;
        var _MNumber: number = 0;
        var keyss:Array<Array<string>> = new Array<Array<string>>();
        var keys: Array<string> = new Array<string>();
        keyss.push(keys);
        var key: string = "";
        while (true) {
          CLog();
            if (index < 0) break;
            var token: TokenInfo = tokens[index]
            if (
                lp.consume('.', token, TokenTypes.Punctuator) ||
                lp.consume(':', token, TokenTypes.Punctuator)
            ) {
                keys.push(token.value);
                key = "";
                index--;
                continue;
            }
            if (token.type == TokenTypes.Identifier) {

                keys.push(token.value + key);
                key = "";
                index--;
            }

            if (index < 0) break
            var nextToken: TokenInfo = tokens[index]
            if (lp.consume(';', nextToken, TokenTypes.Punctuator)) {
                break
            } else if (
                lp.consume('.', nextToken, TokenTypes.Punctuator) ||
                lp.consume(':', nextToken, TokenTypes.Punctuator)
            ) {
                keys.push(nextToken.value);
                key = "";
                index--;
                continue;
            }
            else if (lp.consume(')', nextToken, TokenTypes.Punctuator)) {
                if(token.type == TokenTypes.Identifier) break;
                var m_number = 1;
                var beginIndex = index - 1;
                while (true) {
                  CLog();
                    index--;
                    if (lp.consume('(', tokens[index], TokenTypes.Punctuator)) {
                        m_number--;
                        if (m_number == 0) {
                            var leng: number = beginIndex - index;
                            index--;
                            key = "()";
                            break;
                        }

                    } else if (lp.consume(')', tokens[index], TokenTypes.Punctuator)) {
                        g_number++;
                    }
                }

                continue;
            }
            else if (lp.consume(']', nextToken, TokenTypes.Punctuator)) {
                if(token.type == TokenTypes.Identifier) break;
                var g_number = 1;
                var beginIndex = index - 1;
                while (true) {
                  CLog();
                    index--;
                    if (lp.consume('[', tokens[index], TokenTypes.Punctuator)) {
                        g_number--;
                        if (g_number == 0) {
                            var leng: number = beginIndex - index;
                            index--;
                            key = "[]";
                            break;
                        }

                    } else if (lp.consume(']', tokens[index], TokenTypes.Punctuator)) {
                        g_number++;
                    }
                }

                continue;
            }
            else {
                break;
            }
        }
   
        var moduleName:string = "";
        
        if(keys.length == 2){
            if(keys[1]== "self" && (keys[0] == ':' 
             || keys[0] == '.'
            ))
            {
                var keys1:Array<string> = [keys[0],"self"];
                //检查 function
                //找出self 代表的 模块名
                //向上找 function
                var moduleName:string = getSelfToModuleName(tokens,lp)
                if(moduleName)
                {
                    keys1[1] = moduleName
                    keyss.push(keys1)
                }
            }
        } 
        // console.log("moduleName:"+moduleName)
        
        return [keyss,tokens]
    }




    


}
