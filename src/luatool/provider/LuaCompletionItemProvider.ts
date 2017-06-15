
'use strict';

import vscode = require('vscode');

import { LuaParse } from '../LuaParse'
import { LuaParseTool } from '../LuaParseTool'
import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
import { CLog, getSelfToModuleName, getCurrentFunctionName } from '../Utils'
import { ProviderUtils } from '../provider/providerUtils'
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems"
import { LuaCompletionItemControler } from "./LuaCompletionItemControler";
import { CommentLuaCompletionManager } from "../manager/CommentLuaCompletionManager";
import { CompletionItem, CompletionItemKind } from "vscode";
import { CacheCompletionInfo } from "../manager/CacheCompletionInfo";


export class LuaCompletionItemProvider implements vscode.CompletionItemProvider {

  
    public provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken): Thenable<vscode.CompletionItem[]> {

        return this.provideCompletionItemsInternal(document, position, token, vscode.workspace.getConfiguration('lua'));
    }
    private checkFunReturnModule(line: string): Array<LuaFiledCompletionInfo> {
        var line = line.trim()
        var commenstrs = ["--@valueReference","--@parentClass","--@returnValue"]
        var commenstr = null;
        for (var index = 0; index < commenstrs.length; index++) {
            var cstr = commenstrs[index];
           var rindex =  line.indexOf(cstr)
            if(rindex == 0){
                 return LuaFileCompletionItems.getLuaFileCompletionItems().completions
            }
        }
        return null
    }

    public checkCommenLuaCompletion(line: string, document: vscode.TextDocument, position: vscode.Position): Array<vscode.CompletionItem> {
        var line = line.trim()

        var commenstr: string = "--@"

        if (line == commenstr) {
            let lineText = document.lineAt(position.line).text;
            if (document.lineCount > position.line + 2) {
                var start: vscode.Position = new vscode.Position(position.line+1, 0)
                var end: vscode.Position = new vscode.Position(document.lineCount, 200)
                var lp: LuaParse = LuaParse.lp;
                var lpt: LuaParseTool = LuaParse.lp.lpt;
                var tokens: Array<TokenInfo> = new Array<TokenInfo>();
                lpt.Reset(document.getText(new vscode.Range(start, end)))
                var isFun = false
                var isArgs = false
                var index = 0;
                while (true) {
                    var token: TokenInfo = lpt.lex();
                    if (token.error != null) {

                        break
                    }
                    if (token.type == TokenTypes.EOF) {
                        break;
                    }

                    if (index == 0) {
                        if(token.value == "local" && token.type == TokenTypes.Keyword){
                             token = lpt.lex();
                        }
                        if (token.value == "function" && token.type == TokenTypes.Keyword) {
                            isFun = true;

                        } else {
                            isFun = false
                            break
                        }
                    }
                    if (token.value == "(" && token.type == TokenTypes.Punctuator) {
                        isArgs = true
                        break
                    }
                    index++;
                }
            }
            var args: Array<string> = new Array<string>();
            if (isFun && isArgs) {
                while (true) {
                    var token: TokenInfo = lpt.lex();
                    if (token.error != null) {
                        break
                    }
                    if (token.value == ")" && token.type == TokenTypes.Punctuator) {
                        break
                    }
                    if (token.type == TokenTypes.Identifier) {
                        args.push(token.value)
                        token = lpt.lex();
                        if (token.error != null) {
                            break
                        }
                        if(token.type == TokenTypes.Punctuator && token.value == ","){

                        }else{
                            break;
                        }
                    }else{
                        break;
                    }
                }
            }
            var items:Array<CompletionItem> = new Array<CompletionItem>();
            if(args.length>0){
                args.forEach(arg=>{
                     var item:CompletionItem = new CompletionItem(arg +" ",CompletionItemKind.Variable)
                     item.documentation = "参数:"+arg
                      items.push(item)
          
                })
           
            
       

            }
            if(items.length >0){
                CommentLuaCompletionManager.getIns().items.forEach(v=>{
                    items.push(v)
                })
                return items
            }else
            {
                return CommentLuaCompletionManager.getIns().items;
            }
            

        }
        return null
    }


    public provideCompletionItemsInternal(document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        config: vscode.WorkspaceConfiguration): Thenable<vscode.CompletionItem[]> {

        return new Promise<vscode.CompletionItem[]>((resolve, reject) => {
            let filename = document.fileName;
            let lineText = document.lineAt(position.line).text;
            var requireRuggestions: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            var suggestions: Array<vscode.CompletionItem> = new Array<vscode.CompletionItem>();
            let lineTillCurrentPosition = lineText.substr(0, position.character);

            //提示return 返回值的
            var returnValueCompletions: Array<vscode.CompletionItem> = this.checkCommenLuaCompletion(lineTillCurrentPosition, document, position)
            if (returnValueCompletions) {
                return resolve(returnValueCompletions)
            }

            returnValueCompletions = this.checkFunReturnModule(lineTillCurrentPosition)
            if (returnValueCompletions) {
                return resolve(returnValueCompletions)
            }

            var infos = this.getCurrentStrInfo(document, position)
            var tokens: Array<TokenInfo> = null
            if (infos != null && infos.length >= 2) {
                tokens = infos[1]
            }
            if (tokens == null) return resolve([])


            if (lineTillCurrentPosition.indexOf("require") > -1) {
                var rstr = lineTillCurrentPosition.trim();
                var lastToken: TokenInfo = tokens[tokens.length - 1]
                if (tokens == null) {
                    tokens = ProviderUtils.getTokens(document, position)
                }
                if (tokens.length >= 2) {
                    if (lastToken.value == "" || lastToken.value == '"') {
                        var rtoken: TokenInfo = tokens[tokens.length - 2]
                        if (rtoken.type == TokenTypes.Identifier &&
                            (rtoken.value == "require")
                        ) {

                            requireRuggestions = LuaFileCompletionItems.getLuaFileCompletionItems().completions;
                        } else {
                            if (tokens.length >= 3) {
                                var rtoken: TokenInfo = tokens[tokens.length - 3]
                                if (rtoken.type == TokenTypes.Identifier &&
                                    (rtoken.value == "require")
                                ) {
                                    requireRuggestions = LuaFileCompletionItems.getLuaFileCompletionItems().completions;
                                }
                            }
                        }
                    }
                }
            }
            if (infos == null) return resolve(requireRuggestions);
            var functionNames: Array<string> = getCurrentFunctionName(tokens)
            //进行推断处理
            var keys: Array<string> = infos[0]
            if (keys.length == 0) return resolve(requireRuggestions)
            var citems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            //  var keys = keys.reverse()
            LuaCompletionItemControler.getIns().getLuaCompletionsByKeysAndFunNames(document.uri, keys, functionNames, citems, true)

            var funItems:Array<CompletionItem> = new Array<CompletionItem>();
            //清理一下 只保存一份 如果有方法优先方法
            var onlyItems: Map<string, CompletionItem> = new Map<string, CompletionItem>();
            citems.forEach(v => {
                if (onlyItems.has(v.label)) {
                    var oldItem = onlyItems.get(v.label)
                    if (v.kind == vscode.CompletionItemKind.Function && oldItem.kind != vscode.CompletionItemKind.Function) {
                        var newFun =  CacheCompletionInfo.getIns().getItem(v)
                        funItems.push(newFun)
                        onlyItems.set(v.label, newFun)

                    }
                } else {
                    if (v.kind == vscode.CompletionItemKind.Function){
                        var newFun =  CacheCompletionInfo.getIns().getItem(v)
                        funItems.push(newFun)
                        onlyItems.set(v.label, newFun)
                    }else{
                        onlyItems.set(v.label, v)
                    }
                    


                }


            })
            var argsItems: Array<LuaFiledCompletionInfo>;
            if (infos[0].length == 1) {
                argsItems = LuaParse.lp.luaInfoManager.getFunctionArgs(infos[1], document.uri)
            }
            if (argsItems) {
                argsItems.forEach(v => {
                    if (!onlyItems.has(v.label)) {
                        onlyItems.set(v.label, v)
                    }
                });
            }
            onlyItems.forEach((v1, k) => {
                suggestions.push(v1)
            })
            // var functionitem: Array<LuaFiledCompletionInfo> = LuaParse.lp.luaInfoManager.getFunctionCompletionItems(
            //     document.uri, infos[0])
            // if (functionitem == null) return resolve(requireRuggestions)
            // var argsItems: Array<LuaFiledCompletionInfo>;
            // if (infos[0].length == 1) {
            //     argsItems = LuaParse.lp.luaInfoManager.getFunctionArgs(infos[1], document.uri)
            // }
            // if (argsItems) {
            //     argsItems.forEach(element => {
            //         suggestions.push(element)
            //     });
            // }
            // functionitem.forEach(element => {
            //     suggestions.push(element)
            // });
            // requireRuggestions.forEach(element => {
            //     suggestions.push(element)

            // })
            CacheCompletionInfo.getIns().pushItems(funItems)
            funItems = null;
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

        var keys: Array<string> = new Array<string>();

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
                if (token.type == TokenTypes.Identifier) break;
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
                if (token.type == TokenTypes.Identifier) break;
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

        var moduleName: string = "";

        if (keys.length >= 2) {
            if (keys[keys.length - 1] == "self" && (keys[keys.length - 2] == ':'
                || keys[keys.length - 2] == '.'
            )) {

                //检查 function
                //找出self 代表的 模块名
                //向上找 function
                var data = getSelfToModuleName(tokens, lp)
                if (data) {
                    var moduleName: string = data.moduleName
                    keys[keys.length - 1] = moduleName

                }
            }
        }
        // console.log("moduleName:"+moduleName)

        return [keys, tokens]
    }

    public findTokenByKey(keys: string, tokens: Array<TokenInfo>) {

        var length = tokens.length
        var key = keys[1]
        for (var index = 0; index < tokens.length; index++) {
            var element = tokens[index];

            if (key == element.value && element.type == TokenTypes.Identifier) {
                if (length - 1 >= index + 1) {
                    var nextToken: TokenInfo = tokens[index + 1]
                    if (nextToken.value == "=" && TokenTypes.Punctuator == nextToken.type) {
                        var isEqual = true
                        if (keys.length > 2) {
                            //向上找
                            for (var j = 2; j < keys.length; j++) {
                                if (index - 1 >= tokens.length) {
                                    isEqual = false
                                    break
                                }
                                if (tokens[index - 1].value != keys[j]) {
                                    isEqual = false
                                    break
                                }
                            }
                        } else {
                            isEqual = true
                        }
                        if (isEqual) {
                            // console.log()
                        }
                    }
                }

            }
        }

    }





}
