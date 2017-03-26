
'use strict';
import vscode = require('vscode');
import {Uri, SymbolInformation, Position, Range, SymbolKind} from 'vscode';
import {LuaParse} from '../LuaParse'
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../TokenInfo';
import {LuaFiledCompletionInfo} from "../provider/LuaFiledCompletionInfo"
import {LuaParseTool} from '../LuaParseTool';
import {CompletionItem, CompletionItemKind} from "vscode"
import {CLog, getFirstComments, getComments, getSelfToModuleName, getTokens} from '../Utils'
import {LuaSymbolInformation} from "./LuaSymbolInformation"
export class FileCompletionItemManager {
    public uri: Uri;
    public symbols: Array<LuaSymbolInformation>;
    public tokens: Array<TokenInfo>;
    public luaFiledCompletionInfo: LuaFiledCompletionInfo;
    public luaFunCompletionInfo: LuaFiledCompletionInfo;
    public luaGolbalCompletionInfo: LuaFiledCompletionInfo;
    public lp: LuaParse;
    public constructor(uri: Uri) {
        this.uri = uri;
        this.luaFunCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null);
        this.luaFiledCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null);
        this.luaGolbalCompletionInfo = new LuaFiledCompletionInfo("", CompletionItemKind.Class, uri, null);
        this.symbols = new Array<LuaSymbolInformation>();

    }
    public clear() {
        this.luaFiledCompletionInfo.items.clear();
        this.luaFiledCompletionInfo.lowerCaseItems.clear();
        this.luaFunCompletionInfo.items.clear();
        this.luaFunCompletionInfo.lowerCaseItems.clear();
        this.luaGolbalCompletionInfo.items.clear();
        this.luaGolbalCompletionInfo.lowerCaseItems.clear();
        this.symbols = new Array<LuaSymbolInformation>();
    }
    /**
     * 将self 中的变量放入root 节点中
     */
    public selfToGolbal() {
        this.tokens = null
        //    var item:LuaFiledCompletionInfo =  this.luaFiledCompletionInfo.getItemByKey("self")
        //    if(item){
        //        item.items.forEach((v,k)=>{

        //            getSelfToModuleName(this.lp.tokens,this.lp)
        //        if(! this.luaGolbalCompletionInfo.getItemByKey(k)){
        //         //    getTokens(this.lp.)
        //            this.luaGolbalCompletionInfo.addItem(v);
        //        }
        //    })
        //    }

    }
    public addFunctionCompletion(
        lp: LuaParse,
        luaInfo: LuaInfo,
        token: TokenInfo,
        functionEndToken: TokenInfo) {
        this.addCompletionItem(lp, luaInfo, token, true)
        this.addSymbol(lp, luaInfo, token, functionEndToken)
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


    public getSymbolArgsByNames(funNames:Array<string>):Array<LuaFiledCompletionInfo>
    {
        var argLuaFiledCompleteInfos:Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>()
         for (var i = 0; i < this.symbols.length; i++) {
             var symbol = this.symbols[i]
             for (var j = 0; j < funNames.length; j++) {
                 var name = funNames[j];
                if(symbol.name == name)
                {
                    for (var k = 0; k < symbol.argLuaFiledCompleteInfos.length; k++) {
                        var alc = symbol.argLuaFiledCompleteInfos[k];
                        argLuaFiledCompleteInfos.push(alc)
                    }
                }
             }
            
         }
         return argLuaFiledCompleteInfos;
    }


    public addSymbol(lp: LuaParse, luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo, symolName?: string) {
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
        if (lp.currentfunctionCount == 0) {
            symbolInfo.isLocal = false;
        } else {
            symbolInfo.isLocal = true;
            var functionName = "";
            lp.currentFunctionNames.forEach(fname => {
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
    public addCompletionItem(lp: LuaParse, luaInfo: LuaInfo, token: TokenInfo, isFun: boolean = false) {
        this.lp = lp;
        this.tokens = lp.tokens;
        // console.log("line:"+luaInfo.startToken.line)
        // console.log("line:"+luaInfo.startToken.value)
        var starIndex: number = luaInfo.startToken.index;
        var endIndex: number = token.index;
        var label: string = "";
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
        var startInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        var infos: Array<CompletionItemSimpleInfo> = this.getCompletionKey(starIndex, endIndex);

        var forindex: number = 0;
        if (isFun) {
            startInfos.push(this.luaFunCompletionInfo);
        } else if (lp.currentfunctionCount == 0) {

            startInfos.push(this.luaGolbalCompletionInfo);
        }
        else {
            if (infos.length == 0) {
                startInfos.push(this.luaFiledCompletionInfo);
            }
            else if (infos[0].key == "self") {
                var moduleName = getSelfToModuleName(this.tokens.slice(0, endIndex), this.lp)
                //找到self 属于谁
                var golbalCompletion = this.luaGolbalCompletionInfo.getItemByKey(moduleName);
                if (golbalCompletion) {
                    forindex = 1;
                    startInfos.push(golbalCompletion);
                } else {
                    startInfos.push(this.luaFiledCompletionInfo);
                }
            } else {
                startInfos.push(this.luaFiledCompletionInfo);
            }

        }



        for (var i = forindex; i < infos.length; i++) {
            var newStartInfos: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            startInfos.forEach(startInfo => {
                var completion: LuaFiledCompletionInfo = startInfo.getItemByKey(infos[i].key)
                if (completion == null) {

                    completion = new LuaFiledCompletionInfo(infos[i].key, infos[i].kind, lp.currentUri, infos[i].position)
                    startInfo.addItem(completion)
                    completion.isShow = infos[i].isShow;
                    // completion.textEdit.newText = infos[i].insterStr;
                    completion.documentation = infos[i].desc;
                    completion.comments = infos[i].comments
                } else {
                    if (infos[i].desc) {
                        completion.documentation = infos[i].desc
                    }
                }
                completion.setType(infos[i].tipTipType)
                if (infos[i].nextInfo) {
                    var nextInfo: CompletionItemSimpleInfo = infos[i].nextInfo

                    var nextCompletion: LuaFiledCompletionInfo = completion.getItemByKey(nextInfo.key)
                    if (nextCompletion == null) {
                        nextCompletion = new LuaFiledCompletionInfo(nextInfo.key, nextInfo.kind, lp.currentUri, nextInfo.position);
                        nextCompletion.setType(1)
                        nextCompletion.isShow = nextInfo.isShow;
                        // nextCompletion.textEdit.newText = nextInfo.insterStr;
                        completion.addItem(nextCompletion);
                        newStartInfos.push(nextCompletion)
                    }
                } else {
                    newStartInfos.push(completion)
                }
                var aliasInfos: Array<CompletionItemSimpleInfo> = infos[i].aliasInfos;
                if (aliasInfos.length > 0) {
                    aliasInfos.forEach(aliasInfo => {
                        var aliasCompletion: LuaFiledCompletionInfo =
                            startInfo.getItemByKey(aliasInfo.key)
                        if (aliasCompletion == null) {
                            aliasCompletion = new LuaFiledCompletionInfo(aliasInfo.key, aliasInfo.kind, lp.currentUri, aliasInfo.position)
                            startInfo.addItem(aliasCompletion)
                            aliasCompletion.documentation = infos[i].desc;
                            aliasCompletion.isShow = aliasInfo.isShow;
                        }
                        aliasCompletion.setType(infos[i].tipTipType)
                        newStartInfos.push(aliasCompletion)
                    });

                }



            });
            startInfos = newStartInfos

        }
        if (luaInfo.type == LuaInfoType.Function) {

            // var paramsstr = "("
            // var params:Array<string> =  luaInfo.params
            // params.forEach(element => {
            //     paramsstr += element+ ","
            // });
            // if(params.length >0)
            // {
            //    paramsstr =  paramsstr.substr(0,paramsstr.length-1)
            // }
            // paramsstr += ")"
            startInfos.forEach(startInfo => {
                startInfo.params = luaInfo.params
                startInfo.kind = CompletionItemKind.Function;
                // startInfo.label += paramsstr;
            })
        }
        //判断 luaInfo 
        if (luaInfo.tableFileds && luaInfo.tableFileds.length) {
            var tableFileds: Array<LuaInfo> = luaInfo.tableFileds;
            startInfos.forEach(startInfo => {
                tableFileds.forEach(filed => {
                    if (!startInfo.getItemByKey(filed.name)) {
                        if (filed.tableFiledType == 0) {
                            var completion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo(
                                filed.name, CompletionItemKind.Field, lp.currentUri,
                                new vscode.Position(filed.endToken.line, filed.endToken.lineStart));
                            startInfo.addItem(completion)
                            completion.setType(1)
                        } else {
                            var completion: LuaFiledCompletionInfo = new LuaFiledCompletionInfo(
                                startInfo.label + filed.name,
                                CompletionItemKind.Field, lp.currentUri, new vscode.Position(filed.startToken.line, filed.startToken.lineStart));
                            startInfo.parent.addItem(completion)
                            if (startInfo.parent == this.luaFiledCompletionInfo) {
                                completion.setType(0)
                            } else {
                                completion.setType(1)
                            }
                        }
                    }
                })

            });
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
                    } else if (this.lp.consume('local', upToken, TokenTypes.Identifier)) {
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
                this.lp.consume('[', keyToken, TokenTypes.Punctuator)
                && infos.length > 0) {

                simpleInfo = infos[infos.length - 1]
                if (simpleInfo.aliasInfos.length > 0) {
                    simpleInfo.key = simpleInfo.aliasInfos[0].key;
                }
            } else {
                simpleInfo = new CompletionItemSimpleInfo(key, starIndex, CompletionItemKind.Field, tipType, new vscode.Position(keyToken.line, keyToken.lineStart));

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
                                    var nextSimpleInfo: CompletionItemSimpleInfo = new CompletionItemSimpleInfo(stringToken.value, starIndex, CompletionItemKind.Field, 1, new vscode.Position(stringToken.line, stringToken.lineStart))
                                    lastInfo.nextInfo = nextSimpleInfo;
                                    // var aliasInfo: CompletionItemSimpleInfo = new CompletionItemSimpleInfo(
                                    //     lastInfo.key + '["' + stringToken.value + '"]'
                                    //     , starIndex, CompletionItemKind.Field, 1, new vscode.Position(stringToken.line, stringToken.lineStart))
                                    // lastInfo.aliasInfos.push(aliasInfo)
                                    // aliasInfo = new CompletionItemSimpleInfo(
                                    //     lastInfo.key + '[]'
                                    //     , starIndex, CompletionItemKind.Field, 1, lastInfo.position)

                                    // lastInfo.aliasInfos.push(aliasInfo)
                                } else if (
                                    stringToken.type == TokenTypes.NumericLiteral ||
                                    stringToken.type == TokenTypes.BooleanLiteral ||
                                    stringToken.type == TokenTypes.Identifier ||
                                    stringToken.type == TokenTypes.VarargLiteral
                                ) {
                                    // var aliasInfo: CompletionItemSimpleInfo = new CompletionItemSimpleInfo(
                                    //     lastInfo.key + '[' + stringToken.value + ']'
                                    //     , starIndex, CompletionItemKind.Field, 1, lastInfo.position)
                                    // lastInfo.aliasInfos.push(aliasInfo)
                                    // lastInfo.key = lastInfo.key + "[]"
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
            if (simpleInfo.aliasInfos.length > 0) {
                simpleInfo.aliasInfos.forEach(info => {
                    // info.key += "()"
                    info.desc = commentstr;
                    info.comments = comments;
                    info.kind = skind;
                })
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


}

export class CompletionItemSimpleInfo {
    public key: string;
    public endIndex11: number;
    public tipTipType: number;
    public kind: CompletionItemKind;
    public desc: string = null;
    public aliasInfos: Array<CompletionItemSimpleInfo> = null;
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
        this.aliasInfos = new Array<CompletionItemSimpleInfo>();
    }
}