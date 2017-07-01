
'use strict';
import vscode = require('vscode');
import { Uri, SymbolInformation, Position, Range, SymbolKind } from 'vscode';
import { LuaParse } from '../LuaParse'
import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from '../TokenInfo';
import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import { LuaParseTool } from '../LuaParseTool';
import { CompletionItem, CompletionItemKind } from "vscode"
import { CLog, getFirstComments, getCurrentFunctionName, getComments, getSelfToModuleName, getTokens } from '../Utils'
import { LuaSymbolInformation } from "./LuaSymbolInformation"
import { ExtensionManager } from "../ex/ExtensionManager";

export class FileCompletionItemManager {
    //当前解析方法名集合  在解析完毕后 会设置为null
    public currentFunctionNames: Array<string> = null;
    public currentFunctionParams: Array<Array<string>> = null;
    public currentSymbolFunctionNames: Array<string> = null;
    public uri: Uri;
    //方法集合 用于 方法查找
    public symbols: Array<LuaSymbolInformation> = null;
    //临时值 解析完毕 会设置为null
    public tokens: Array<TokenInfo> = null;
    //解析0.2.3 之前会用到 后期 由luaFunFiledCompletions 替代
    // public luaFiledCompletionInfo: LuaFiledCompletionInfo = null;
    //记录当前文档的所有方法
    public luaFunCompletionInfo: LuaFiledCompletionInfo = null;
    //全局变量提示 这里在0.2.2 中继续了细化 将文件的全局 和整体全局 区分开来   luaGolbalCompletionInfo 为总体全局
    //luaFileGolbalCompletionInfo 当前文件的全局变量   两者配合使用
    public luaGolbalCompletionInfo: LuaFiledCompletionInfo = null;
    //文件分为的全局变量 存储
    public luaFileGolbalCompletionInfo: LuaFiledCompletionInfo = null;

    //对每个方法中的的变量通过方法名进行存储 这样可以更加精确地进行提示 而不是整体对在体格completion中
    public luaFunFiledCompletions: Map<string, LuaFiledCompletionInfo> = null;
    //当前方法的Completion 与luaFunFiledCompletions 配合
    private currentFunFiledCompletion: LuaFiledCompletionInfo = null;

    //根据 文件中return 进行设置
    public rootFunCompletionInfo: LuaFiledCompletionInfo = null;
    public rootCompletionInfo: LuaFiledCompletionInfo = null;

    public lp: LuaParse;
    public constructor(uri: Uri) {
        this.lp = LuaParse.lp;
        this.currentFunctionNames = new Array<string>();
        this.currentSymbolFunctionNames = new Array<string>();
        this.currentFunctionParams = new Array<Array<string>>();
        this.uri = uri;
        this.luaFunCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null, false);

        this.luaGolbalCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null, false);
        this.luaFileGolbalCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null, false);
        this.symbols = new Array<LuaSymbolInformation>();
        this.luaFunFiledCompletions = new Map<string, LuaFiledCompletionInfo>();
    }


    public clear() {

        this.luaFunCompletionInfo.clearItems();
       
        this.luaGolbalCompletionInfo.clearItems();

        this.luaFileGolbalCompletionInfo.clearItems;

        this.currentFunctionParams = null;
        this.symbols = null
        this.luaFunFiledCompletions.clear()
        this.rootCompletionInfo = null
        this.rootFunCompletionInfo = null
        this.currentFunFiledCompletion = null
        this.tokens = null
    }
    //设置根 用于类型推断
    public setRootCompletionInfo(rootName: string) {
        this.rootCompletionInfo = this.luaFileGolbalCompletionInfo.getItemByKey(rootName)
        if (this.rootCompletionInfo == null) {
            this.rootCompletionInfo = this.luaGolbalCompletionInfo.getItemByKey(rootName)
        }
        this.rootFunCompletionInfo = this.luaFunCompletionInfo.getItemByKey(rootName)

    }
    /**
     * 添加方法开始 标记  
     * @param funName 方法名称
     */
    public setBeginFunName(funName: string, params: Array<string>) {
        var luaCompletion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Function, this.lp.tempUri, null, false)
        this.currentSymbolFunctionNames.push(funName)
        this.currentFunctionParams.push(params)
        if (this.currentFunFiledCompletion) {
            funName = this.currentFunFiledCompletion.label + "->" + funName
            //记录父方法的根
            luaCompletion.funParentLuaCompletionInfo = this.currentFunFiledCompletion;
        }
        this.currentFunctionNames.push(funName)

        luaCompletion.label = funName
        this.luaFunFiledCompletions.set(funName, luaCompletion)
        luaCompletion.completionFunName = funName
        this.currentFunFiledCompletion = luaCompletion;
    }
    public setEndFun() {
        this.currentSymbolFunctionNames.pop()
        this.currentFunctionNames.pop()
        this.currentFunctionParams.pop()
        if (this.currentFunctionNames.length > 0) {
            var funName = this.currentFunctionNames[this.currentFunctionNames.length - 1]
            this.currentFunFiledCompletion = this.luaFunFiledCompletions.get(funName)
        } else {
            this.currentFunFiledCompletion = null;
        }
    }
    public addFunctionCompletion(
        lp: LuaParse,
        luaInfo: LuaInfo,
        token: TokenInfo,
        functionEndToken: TokenInfo) {
        var symbol: LuaSymbolInformation = this.addSymbol(lp, luaInfo, token, functionEndToken)
       
        var completion: LuaFiledCompletionInfo = this.addCompletionItem(lp, luaInfo, token, this.tokens, true)
        completion.completionFunName = symbol.name
       
        var argsStr =""
        var snippetStr = "";
        for (var index = 0; index < symbol.argLuaFiledCompleteInfos.length; index++) {
            var v = symbol.argLuaFiledCompleteInfos[index];
             argsStr += v.label+","
             snippetStr +=  "${"+ (index+1) +":"+ v.label +"},";
           
        }
       
        if(argsStr!=""){
           argsStr = argsStr.substring(0,argsStr.length-1);
           snippetStr = snippetStr.substring(0,snippetStr.length-1);
           snippetStr = completion.label +"("+ snippetStr +")";
            var snippetString:  vscode.SnippetString = new vscode.SnippetString(snippetStr)
            completion.funvSnippetString = snippetString
        }
         var funLabelStr= completion.label +"("+ argsStr +")";
        completion.funLable = funLabelStr
       
       
       
        
        
        this.checkFunAnnotationReturnValue(completion);
        this.checkFunReturnValue(completion, token.index, functionEndToken.index)
        
    }

    public checkValueReferenceValue(completion:LuaFiledCompletionInfo)
{
     if(completion.comments == null){return}
         for (var index = 0; index < completion.comments.length; index++) {
            var element = completion.comments[index];
            var returnValue = "@valueReference"
            var num = element.content.indexOf(returnValue)
            if(num == 0){
               var className =   element.content.substring(returnValue.length).trim()
               if(className[0] == "["){
                   var endIndex = className.indexOf("]")
                   className = className.substring(1,endIndex)
                   className = className.trim();
                    completion.valueReferenceModulePath = className;
                    break;
               }
               
            }
        }
}
    //检查父类引用
    public checkParentClassValue(completion:LuaFiledCompletionInfo){
        if(completion.comments == null){return}
         for (var index = 0; index < completion.comments.length; index++) {
            var element = completion.comments[index];
            var returnValue = "@parentClass"
            var num = element.content.indexOf(returnValue)
            if(num == 0){
               var className =   element.content.substring(returnValue.length).trim()
               if(className[0] == "["){
                   var endIndex = className.indexOf("]")
                   className = className.substring(1,endIndex)
                   className = className.trim();
                    
                    completion.parentModulePath = className
               }
               
            }
        }
    }



    //检查注释的返回值
    public checkFunAnnotationReturnValue(completion: LuaFiledCompletionInfo){
        if(completion.comments == null)return;
        for (var index = 0; index < completion.comments.length; index++) {
            var element = completion.comments[index];
            var returnValue = "@return"
            var num = element.content.indexOf(returnValue)
          
            if(num == 0){
               var className =   element.content.substring(returnValue.length).trim()
               if(className[0] == "["){
                   var endIndex = className.indexOf("]")
                   className = className.substring(1,endIndex)
                   className = className.trim();
                   // console.log(className)
                    completion.funAnnotationReturnValue = className
               }
               
            }
        }
    }
    //检查返回值
    public checkFunReturnValue(completion: LuaFiledCompletionInfo, startIndex: number, endTokenIndex: number) {
        var index = startIndex;
        while (index < endTokenIndex) {

            var token: TokenInfo = this.tokens[index]
            index++;
            if (token.type == TokenTypes.Keyword && token.value == "return") {
                var info = this.getCompletionValueKeys(this.tokens, index)
                if (info) {
                    if (info == null || info.type == null) {
                        var xx = 1
                    }
                    if (info.type == 1) {
                        completion.addFunctionReturnCompletionKeys(completion.completionFunName, info.keys)
                    } else {

                    }
                }


            }

        }
    }

    public getSymbolEndRange(functionName: string): vscode.Range {
        var symbol: LuaSymbolInformation = null;
        var range: vscode.Range;
        for (var i = 0; i < this.symbols.length; i++) {
            symbol = this.symbols[i]
            if (!symbol.isLocal) {
                if (symbol.name == functionName) {
                    var loc: vscode.Position = new Position(symbol.location.range.end.line + 1, 0)
                    range = new vscode.Range(
                        loc, loc)
                    break;

                }
            }
        }
        if (range == null && symbol != null) {
            var loc: vscode.Position = new Position(symbol.location.range.end.line, symbol.location.range.end.character)
            range = new vscode.Range(
                loc, loc)
        }
        //没找到直接找最后
        return range
    }


    public getSymbolArgsByNames(funNames: Array<string>): Array<LuaFiledCompletionInfo> {
        var argLuaFiledCompleteInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>()
        for (var i = 0; i < this.symbols.length; i++) {
            var symbol = this.symbols[i]
            for (var j = 0; j < funNames.length; j++) {
                var name = funNames[j];
                if (symbol.name == name) {
                    for (var k = 0; k < symbol.argLuaFiledCompleteInfos.length; k++) {
                        var alc = symbol.argLuaFiledCompleteInfos[k];
                        argLuaFiledCompleteInfos.push(alc)
                    }
                }
            }

        }
        return argLuaFiledCompleteInfos;
    }


    public addSymbol(lp: LuaParse, luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo, symolName?: string): LuaSymbolInformation {
        var parentName: string = "";
        var tokens: Array<TokenInfo> = lp.tokens;
        var starIndex: number = luaInfo.startToken.index;
        var endIndex: number = token.index;
        var label: string = "";
        var symbolInfo = new LuaSymbolInformation(
            token.value,
            SymbolKind.Function,
            new Range(
                new Position(luaInfo.startToken.line, luaInfo.startToken.range.start),
                new Position(functionEndToken.line, token.range.end)
            ),
            undefined,
            getFirstComments(luaInfo.getComments()));

        var nindex: number = token.index;
        while (true) {
            nindex--;
            var upToken: TokenInfo = tokens[nindex]
            if (upToken == null) {
                break;
            }
            nindex--;
            if (

                lp.consume(':', upToken, TokenTypes.Punctuator) ||
                lp.consume('.', upToken, TokenTypes.Punctuator)) {
                var mtokenInfo: TokenInfo = tokens[nindex];

                symbolInfo.name = mtokenInfo.value + upToken.value + symbolInfo.name;
            } else {
                break;
            }
        }


        if (symolName != null) {
            symbolInfo.name = symolName;
        }

        if (this.currentSymbolFunctionNames.length == 0) {
            symbolInfo.isLocal = false;
        } else {
            symbolInfo.isLocal = true;
            var functionName = "";
            this.currentSymbolFunctionNames.forEach(fname => {
                if (functionName == "") {
                    functionName = fname;
                } else {
                    functionName = functionName + "->" + fname;
                }
            });
            symbolInfo.name = functionName + "->" + symbolInfo.name;

        }
        symbolInfo.initArgs(luaInfo.params, luaInfo.getComments())
        this.symbols.push(symbolInfo)
        return symbolInfo
    }
    private findLastSymbol(): LuaSymbolInformation {
        for (var i = this.symbols.length - 1; i > 0; i--) {
            var symbolInfo = this.symbols[i];
            if (!symbolInfo.location) {
                return symbolInfo;
            }
        }
        return null
    }

    /**
     * 添加itemm
     */
    public addCompletionItem(lp: LuaParse, luaInfo: LuaInfo, token: TokenInfo, tokens: Array<TokenInfo>,
        isFun: boolean = false,
        isCheckValueRequire: boolean = false
    ): LuaFiledCompletionInfo {
        this.lp = lp;
        this.tokens = lp.tokens;
        // console.log("line:"+luaInfo.startToken.line)
        // console.log("line:"+luaInfo.startToken.value)
        var starIndex: number = luaInfo.startToken.index;
        var endIndex: number = token.index;
        var label: string = "";
        // console.log(starIndex,endIndex)
        if (starIndex == endIndex) {
            var singleToken: TokenInfo = this.tokens[starIndex];
            if (singleToken.type == TokenTypes.NumericLiteral ||
                singleToken.type == TokenTypes.BooleanLiteral ||
                singleToken.type == TokenTypes.NilLiteral ||
                singleToken.type == TokenTypes.StringLiteral

            ) {
                // if(singleToken.type == TokenTypes.StringLiteral)
                // {
                //     var item:LuaFiledCompletionInfo = new LuaFiledCompletionInfo(singleToken.value,CompletionItemKind.Text,lp.currentUri,new Position(singleToken.line,singleToken.lineStart))
                //     this.luaFiledCompletionInfo.addItem(item)
                // }
                return;
            }

        }

        var stoken = this.tokens[starIndex]
        
        if (
            stoken.type == TokenTypes.NumericLiteral ||
            stoken.type == TokenTypes.BooleanLiteral ||
            stoken.type == TokenTypes.NilLiteral ||
            stoken.type == TokenTypes.StringLiteral ||
            stoken.type == TokenTypes.Punctuator
        ) {

            return

        }
        var startInfos: LuaFiledCompletionInfo = null

        var infos: Array<CompletionItemSimpleInfo> = this.getCompletionKey(starIndex, endIndex);

       
        if (infos == null || infos.length == 0) { return null }
        var isCheckParentPath = false
        var forindex: number = 0;
        if (isFun) {
            startInfos = this.luaFunCompletionInfo;
            if(this.currentFunFiledCompletion != null){
                startInfos = this.currentFunFiledCompletion;
            }
        } else if (this.currentFunctionNames.length == 0) {
            if (luaInfo.isLocal) {
                startInfos = this.luaFileGolbalCompletionInfo
            } else {
                if (this.luaFileGolbalCompletionInfo.getItemByKey(infos[0].key) != null) {
                    startInfos = this.luaFileGolbalCompletionInfo
                } else {
                    startInfos = this.luaGolbalCompletionInfo;
                }
                

            }
            isCheckParentPath = true
        }
        else {
            var data = null
            if (infos[0].key == "self") {
                data = getSelfToModuleName(this.tokens.slice(0, endIndex), this.lp)
            }
            if (data) {
                var moduleName = data.moduleName
                //找到self 属于谁
                var golbalCompletion = this.luaFileGolbalCompletionInfo.getItemByKey(moduleName)
                if (golbalCompletion == null) {
                    golbalCompletion = this.luaGolbalCompletionInfo.getItemByKey(moduleName)
                }
                if (golbalCompletion == null) {
                    var keyToken: TokenInfo = data.token
                    golbalCompletion = new LuaFiledCompletionInfo(moduleName, infos[0].kind, lp.tempUri,
                        new vscode.Position(keyToken.line, keyToken.lineStart), false)
                    
                    this.luaGolbalCompletionInfo.addItem(golbalCompletion)
                }

                forindex = 1;
                startInfos = golbalCompletion;

            } else {
                startInfos = this.currentFunFiledCompletion

                if (luaInfo.isLocal == false) {
                    var key = ""
                    if (infos.length > 0) {
                        key = infos[0].key
                    }
                    var curName: string = ""
                    if (key != "") {
                        //判断是否为参数
                        for (var pi = 0; pi < this.currentFunctionParams.length; pi++) {
                            var argNames = this.currentFunctionParams[pi];
                            for (var ai = 0; ai < argNames.length; ai++) {
                                var paramsName = argNames[ai];
                                if (key == paramsName) {
                                    curName = this.currentFunctionNames[pi]
                                    break
                                }
                            }
                            if (curName != "") {
                                break
                            }
                        }
                    }
                    if (curName != "") {
                        startInfos = this.luaFunFiledCompletions.get(curName)
                    } else {
                        while (true) {
                            var completion: LuaFiledCompletionInfo = startInfos.getItemByKey(infos[0].key)
                            if (completion == null) {
                                if (startInfos.funParentLuaCompletionInfo) {
                                    startInfos = startInfos.funParentLuaCompletionInfo
                                } else {
                                    if (this.luaFileGolbalCompletionInfo.getItemByKey(infos[0].key)) {
                                        startInfos = this.luaFileGolbalCompletionInfo
                                    } else {
                                        startInfos = this.luaGolbalCompletionInfo
                                    }
                                    break
                                }
                            } else {
                                break
                            }

                        }
                    }
                }
            }
        }
        // var golbalCompletionIsNew:boolean = true
        // var isGolbal:boolean = false
        // //如果为全局变量那么检查下是不是赋值 如果不是直接返回
        // if (startInfos == this.luaGolbalCompletionInfo) {
        //     isGolbal = true
        //         var length = tokens.length
        //         var index = token.index + 1;
        //         var currentToken: TokenInfo = this.getValueToken(index, tokens)
        //         if (currentToken) {

        //             if (!(currentToken.type == TokenTypes.Punctuator && currentToken.value == "=")) {
        //                golbalCompletionIsNew = false
        //             }
        //         } else {
        //              golbalCompletionIsNew = false
        //         }


        // }

        // console.log(infos,"infos")
        for (var i = forindex; i < infos.length; i++) {
          
            var newStartInfos: LuaFiledCompletionInfo = null
           
            var completion: LuaFiledCompletionInfo = startInfos.getItemByKey(infos[i].key)
            if (completion == null) {

                completion = new LuaFiledCompletionInfo(infos[i].key, infos[i].kind, lp.tempUri, infos[i].position, isFun)
                
                startInfos.addItem(completion)
                
                // completion.textEdit.newText = infos[i].insterStr;
                if (isFun) {
                    completion.documentation = getFirstComments(infos[i].comments)
                }
                else {
                    completion.documentation = infos[i].desc;
                }
                completion.comments = infos[i].comments
                if(isCheckParentPath && infos.length == 1){
                    this.checkParentClassValue(completion);
                }
            } else {
                if (infos[i].desc && completion.isFun == false) {
                    completion.documentation = infos[i].desc
                }
               
            }
            if(i == infos.length-1){
                if(completion.isNewVar == false && endIndex+2 < tokens.length ){
                    if(lp.consume("=",tokens[endIndex+1],TokenTypes.Punctuator))
                   {
                        completion.isNewVar = true;
                        completion.position = infos[i].position
                    }  
                }
            } 
            completion.setType(infos[i].tipTipType)
            if (infos[i].nextInfo) {
                var nextInfo: CompletionItemSimpleInfo = infos[i].nextInfo
                var nextCompletion: LuaFiledCompletionInfo = completion.getItemByKey(nextInfo.key)
                if (nextCompletion == null) {
                    nextCompletion = new LuaFiledCompletionInfo(nextInfo.key, nextInfo.kind, lp.tempUri, nextInfo.position, isFun);
                    nextCompletion.setType(1)
                    
                   
                    completion.addItem(nextCompletion);
                   
                }else{
                    var xx= 1;

                }
                 newStartInfos = nextCompletion
            } else {
                newStartInfos = completion
            }
            startInfos = newStartInfos

        }
        if (luaInfo.type == LuaInfoType.Function) {

            startInfos.params = luaInfo.params
            startInfos.kind = CompletionItemKind.Function;
            startInfos.isLocalFunction =luaInfo.isLocal;
            var funKey = startInfos.label;
            if(this.currentFunFiledCompletion != null){
                funKey  = this.currentFunFiledCompletion.label + "->" + funKey;
            }
            if(this.luaFunFiledCompletions.has(funKey)){
                this.luaFunFiledCompletions.get(funKey).isLocalFunction = startInfos.isLocalFunction;
            }
            
        }

        this.addTableFileds(luaInfo, startInfos, lp, isFun);
        if (isCheckValueRequire) {
            this.checkCompletionItemValueRequire(token, tokens, startInfos)
        }
        return startInfos
    }
    private addTableFileds(luaInfo: LuaInfo, startInfos: LuaFiledCompletionInfo, lp: LuaParse, isFun: boolean) {
        //判断 luaInfo 
        if (luaInfo.tableFileds && luaInfo.tableFileds.length) {
            var tableFileds: Array<LuaInfo> = luaInfo.tableFileds;

            tableFileds.forEach(filed => {
                if (!startInfos.getItemByKey(filed.name)) {
                    if (filed.tableFiledType == 0) {
                        var completion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo(
                            filed.name, CompletionItemKind.Field, lp.tempUri,
                            new vscode.Position(filed.endToken.line, filed.endToken.lineStart), isFun);
                        startInfos.addItem(completion)
                        completion.setType(1)
                        this.addTableFileds(filed, completion, lp, isFun)
                    } else {
                        var completion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo(
                            startInfos.label + filed.name,
                            CompletionItemKind.Field, lp.tempUri, new vscode.Position(filed.startToken.line, filed.startToken.lineStart), isFun);
                        startInfos.parent.addItem(completion)
                        // if (startInfos.parent == this.luaFiledCompletionInfo) {
                        //     completion.setType(0)
                        // } else {
                        //     completion.setType(1)
                        // }
                        this.addTableFileds(filed, completion, lp, isFun)
                    }
                }
            })
        }
    }

    public getCompletionKey(starIndex: number, endIndex: number): Array<CompletionItemSimpleInfo> {
        // console.log("getCompletionKey")
        var infos: Array<CompletionItemSimpleInfo> = new Array<CompletionItemSimpleInfo>();
        var key: string = "";
        // 1 为 .  2 为 :
        var tipType: number = 0;

        var comments: Array<LuaComment> = null
        //获取注释
        while (true) {

            CLog();
            if (starIndex > endIndex) break;

            var keyToken: TokenInfo = this.tokens[starIndex];
            if (keyToken.type == TokenTypes.Keyword) {
                return infos = [];
            }

            if (comments == null) {
                //判断下 是不是function  和 local 
                if (starIndex - 1 >= 0) {
                    var upToken: TokenInfo = this.tokens[starIndex - 1]
                    if (this.lp.consume('function', upToken, TokenTypes.Keyword)) {
                        comments = upToken.comments;
                        if (starIndex - 2 >= 0) {
                            if (this.lp.consume('local', this.tokens[starIndex - 2], TokenTypes.Keyword)) {
                                comments = this.tokens[starIndex - 2].comments;
                            }
                        }
                    } else if (this.lp.consume('local', upToken, TokenTypes.Keyword)) {
                        comments = upToken.comments;
                    }
                } else {
                    comments = keyToken.comments;
                }


            }
            var key = "";
            if (keyToken.type == TokenTypes.StringLiteral) {
                key += '"' + this.tokens[starIndex].value + '"';
            }
            else {
                key += this.tokens[starIndex].value;
            }
            var simpleInfo: CompletionItemSimpleInfo = null;
            if (
                this.lp.consume('[', keyToken, TokenTypes.Punctuator) ||
                this.lp.consume('(', keyToken, TokenTypes.Punctuator) ||
                this.lp.consume(')', keyToken, TokenTypes.Punctuator) ||
                this.lp.consume(']', keyToken, TokenTypes.Punctuator)
            ) {

                break

            } else {
                simpleInfo = new CompletionItemSimpleInfo(key, starIndex, CompletionItemKind.Field, tipType, new vscode.Position(keyToken.line, 
                keyToken.range.start - keyToken.lineStart));

                infos.push(simpleInfo);
                starIndex++;
                if (starIndex > endIndex) break;
                tipType = this.getTipType(starIndex);
                if (tipType != 0) {
                    starIndex++;
                    continue;
                }
            }
            // console.log(127);



            if (this.lp.consume('[', this.tokens[starIndex], TokenTypes.Punctuator)) {
                var g_number = 1;
                var beginIndex = starIndex + 1;
                while (true) {
                    CLog();
                    starIndex++;
                    if (this.lp.consume(']', this.tokens[starIndex], TokenTypes.Punctuator)) {
                        g_number--;
                        if (g_number == 0) {
                            var leng: number = starIndex - beginIndex
                            var lastInfo: CompletionItemSimpleInfo = infos[infos.length - 1]
                            if (leng == 1) {

                                var stringToken: TokenInfo = this.tokens[beginIndex];
                                var tokenValue: string = "";
                                if (stringToken.type == TokenTypes.StringLiteral) {
                                    tokenValue = '"' + stringToken.value + '"';
                                    var nextSimpleInfo: CompletionItemSimpleInfo = new CompletionItemSimpleInfo(stringToken.value, starIndex, CompletionItemKind.Field, 1, new vscode.Position(stringToken.line, 
                                    stringToken.range.start - stringToken.lineStart
                                    ))
                                    lastInfo.nextInfo = nextSimpleInfo;
                                    
                                } else if (
                                    stringToken.type == TokenTypes.NumericLiteral ||
                                    stringToken.type == TokenTypes.BooleanLiteral ||
                                    stringToken.type == TokenTypes.Identifier ||
                                    stringToken.type == TokenTypes.VarargLiteral
                                ) {
                                    
                                }

                                else {
                                    // lastInfo.key = lastInfo.key + "[]"

                                }

                            } else {

                                // lastInfo.key = lastInfo.key + "[]";

                            }
                            starIndex++;
                            break;
                        }

                    } else if (this.lp.consume('[', this.tokens[starIndex], TokenTypes.Punctuator)) {
                        g_number++;
                    }
                }
                tipType = this.getTipType(starIndex);
                if (tipType != 0) {
                    starIndex++;
                    continue;
                }
            } else {
                var ss = 1;
            }

            if (starIndex > endIndex) break;
            if (this.lp.consume('(', this.tokens[starIndex], TokenTypes.Punctuator)) {
                //   simpleInfo.kind = CompletionItemKind.Function;
                var m_number = 1;
                while (true) {
                    CLog();
                    starIndex++;
                    if (this.lp.consume(')', this.tokens[starIndex], TokenTypes.Punctuator)) {
                        m_number--;
                        if (m_number == 0) {
                            // simpleInfo.key += "()";
                            starIndex++;
                            break;
                        }
                    } else if (this.lp.consume('(', this.tokens[starIndex], TokenTypes.Punctuator)) {
                        m_number++;
                    }
                }
                if (starIndex > endIndex) {
                    break
                }
                tipType = this.getTipType(starIndex);
                if (tipType != 0) {
                    starIndex++;
                    continue;
                }
            }
            if (starIndex > endIndex) {
                break
            }
        }
        if (infos.length > 0) {
            var simpleInfo: CompletionItemSimpleInfo = infos[infos.length - 1]
            var commentstr: string = getComments(comments)
            var skind: CompletionItemKind = simpleInfo.kind;
            if (simpleInfo.nextInfo) {
                simpleInfo.kind = CompletionItemKind.Field;
                simpleInfo.nextInfo.kind = skind;
                simpleInfo.nextInfo.desc = commentstr;
                simpleInfo.comments = comments;
                // simpleInfo.nextInfo.key += "()"
            } else {
                simpleInfo.desc = commentstr;
                simpleInfo.comments = comments;
                // simpleInfo.key += "()"
            }

        }


        return infos;
    }

    public getTipType(starIndex: number): number {
        var tipType: number = 0;
        if (starIndex >= this.tokens.length) return tipType;
        var symbolToken: TokenInfo = this.tokens[starIndex];
        if (this.lp.consume('.', symbolToken, TokenTypes.Punctuator)) {
            tipType = 1;

        } else if (this.lp.consume(':', this.tokens[starIndex], TokenTypes.Punctuator)) {
            tipType = 2;
        }
        return tipType;
    }
    public getValueToken(index: number, tokens: Array<TokenInfo>) {
        if (index < tokens.length) {
            return tokens[index]
        } else {
            return null
        }
    }
    //检查 item赋值 require 路径
    public checkCompletionItemValueRequire(endToken: TokenInfo, tokens: Array<TokenInfo>, completion: LuaFiledCompletionInfo) {
        if(completion.valueReferenceModulePath != null){
            return;
        }
        var length = tokens.length
        var index = endToken.index + 1;
        var currentToken: TokenInfo = this.getValueToken(index, tokens)
        if (currentToken) {
            if (currentToken.type == TokenTypes.Punctuator && currentToken.value == "=") {
                //优先注释
                this.checkValueReferenceValue(completion)
                if(completion.valueReferenceModulePath != null){
                    return;
                }
                index++;
                var funNames: Array<string> = getCurrentFunctionName(this.tokens.slice(0, endToken.index))
                if (funNames.length == 0) {
                    //没有方法那么就是文件中的全局信息
                    funNames.push("__g__")
                }
                currentToken = this.getValueToken(index, tokens)
                if(currentToken == null){
                    return;

                }
                if (currentToken.type == TokenTypes.Identifier) {
                   
                    if ( ExtensionManager.em.luaIdeConfigManager.requireFunNames.indexOf(currentToken.value) > -1 ) {
                        //require 模式
                        index++;
                        currentToken = this.getValueToken(index, tokens)
                        if (currentToken) {
                            if (currentToken.type == TokenTypes.Punctuator && currentToken.value == "(") {
                                index++
                                currentToken = this.getValueToken(index, tokens)
                                if (currentToken != null) {
                                    if (currentToken.type == TokenTypes.StringLiteral) {
                                        var pathValue = currentToken.value;
                                        completion.addRequireReferencePath(pathValue)
                                    } else if (currentToken.type == TokenTypes.Identifier) {
                                        var keysInfo = this.getCompletionValueKeys(tokens, index)
                                        if (keysInfo) {
                                            var keys: Array<string> = keysInfo.keys
                                            if (keys.length > 0) {
                                                completion.addRequireReferenceFileds(funNames[0], keys)
                                            }
                                        }

                                    }
                                }
                            }
                        }
                    } else {
                        var info = this.getCompletionValueKeys(tokens, index)
                        if (info) {


                            if (info.type == 1) {
                                completion.addReferenceCompletionKeys(funNames[0], info.keys)
                            } else {
                                completion.addReferenceCompletionFunKeys(funNames[0], info.keys)
                            }
                        }
                    }
                } else if (currentToken.type == TokenTypes.StringLiteral) {
                    completion.setCompletionStringValue(currentToken.value)
                }
            }
        }
    }
    /**
     * type == 1 字段
     * type == 2 方法
     */
    public getCompletionValueKeys(tokens: Array<TokenInfo>, index: number): any {

        var keys: Array<string> = new Array<string>();
        var keyToken: TokenInfo = tokens[index]
        if (keyToken.type == TokenTypes.Identifier) {
            keys.push(keyToken.value)
            if(keyToken.value == "self"){
               var info = getSelfToModuleName(tokens,LuaParse.lp)
               if(info){
                    keys[0] = info.moduleName
               }
            }
            
        } else {
            return null
        }
        index++;
        while (index < tokens.length) {
            keyToken = tokens[index]
            if (keyToken.type == TokenTypes.Punctuator) {
                if (keyToken.value == "." || keyToken.value == ":") {
                    keys.push(keyToken.value)
                } else if (keyToken.value == "(") {
                    //为一个方法

                    return {
                        type: 2,
                        keys: keys
                    }
                }
                else if (keyToken.value == ")") {
                    return {
                        type: 1,
                        keys: keys
                    }
                }
                else if (keyToken.value == ";") {
                    return {
                        type: 1,
                        keys: keys
                    }
                }
                else {
                    return null
                }
            } else {
                return {
                    type: 1,
                    keys: keys
                }
            }
            index++
            var keyToken = tokens[index]
            if (keyToken.type == TokenTypes.Identifier) {
                keys.push(keyToken.value)
            }
            index++
            if (index >= tokens.length) {
                return null
            }

        }
        return null
    }

    /**
     * 去除多余的completion
     */
    public checkFunCompletion() {
        var items = this.luaFunCompletionInfo.getItems()
        items.forEach((funCompletion, k) => {
            //查找
            var gcompletion: LuaFiledCompletionInfo = this.luaFileGolbalCompletionInfo.getItemByKey(k)
            if (gcompletion) {
                if (funCompletion.getItems().size == 0 && gcompletion.getItems().size == 0) {
                    this.luaFileGolbalCompletionInfo.delItem(k)
                } else {
                    funCompletion.getItems().forEach((fc, k1) => {
                        gcompletion.delItem(k1)
                    })
                }
            }
            gcompletion = this.luaGolbalCompletionInfo.getItemByKey(k)
            if (gcompletion) {
                if (funCompletion.getItems().size == 0 && gcompletion.getItems().size == 0) {
                    this.luaFileGolbalCompletionInfo.delItem(k)
                } else {
                    funCompletion.getItems().forEach((fc, k1) => {
                        gcompletion.delItem(k1)
                    })
                }
            }
        })

    }

}

export class CompletionItemSimpleInfo {
    public key: string;
    public endIndex11: number;
    public tipTipType: number;
    public kind: CompletionItemKind;
    public desc: string = null;

    public nextInfo: CompletionItemSimpleInfo = null;
    public isShow: boolean = true;
    public comments: Array<LuaComment>
    public position: vscode.Position;
    public constructor(key: string, endIndex: number, kind: CompletionItemKind, tipTipType: number, position: vscode.Position) {
        this.position = position;
        this.key = key;
        this.tipTipType = tipTipType;
        this.endIndex11 = endIndex;
        this.kind = kind;

    }
}