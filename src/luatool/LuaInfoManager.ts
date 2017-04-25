import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from './TokenInfo';
import { LuaParse } from "./LuaParse"
import { CompletionItem, CompletionItemKind, Uri } from "vscode"
import { LuaFiledCompletionInfo } from "./provider/LuaFiledCompletionInfo"
import { FileCompletionItemManager, CompletionItemSimpleInfo } from "./manager/FileCompletionItemManager"
import { CLog } from './Utils'
import vscode = require('vscode');
export class FindCompletionInfo {
    public moduleName: string;
    public keys: Array<string>;
}


export class LuaInfoManager {

    public tokens: Array<TokenInfo>;
    public fileCompletionItemManagers: Map<string, FileCompletionItemManager>;

    public lp: LuaParse;


    public currentFcim: FileCompletionItemManager;

    constructor() {

        this.fileCompletionItemManagers = new Map<string, FileCompletionItemManager>();
    }
    private initKeyWrodCompletioins() {

    }
    public setFcim(uri: Uri, fcim: FileCompletionItemManager) {
        this.fileCompletionItemManagers.set(uri.path, fcim);
    }
    public getFcim(uri: Uri) {
        var fcim: FileCompletionItemManager = null;
        if (this.fileCompletionItemManagers.has(uri.path)) {
            fcim = this.fileCompletionItemManagers.get(uri.path)
        }
        return fcim;
    }
    public init(lp: LuaParse, uri: Uri, tempUri: Uri) {
        this.lp = lp;
        this.tokens = lp.tokens;

        this.currentFcim = new FileCompletionItemManager(tempUri);
        this.fileCompletionItemManagers.set(uri.path, this.currentFcim);
        this.currentFcim.clear();
    }
    public addFunctionCompletionItem(luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo) {
        this.currentFcim.addFunctionCompletion(this.lp, luaInfo, token, functionEndToken)
    }
    public addCompletionItem(luaInfo: LuaInfo, token: TokenInfo) {
        this.currentFcim.addCompletionItem(this.lp,
            luaInfo, token);
    }
    public addSymbol(luaInfo: LuaInfo, token: TokenInfo, functionEndToken: TokenInfo, symolName: string) {
        this.currentFcim.addSymbol(this.lp, luaInfo, token, functionEndToken, symolName)
    }

    /**
     * 根据key 获取提示 items
     */
    public getCompletionItemByKeyAndTopType(
        key: string, tipType: number,
        fcoitems: Array<LuaFiledCompletionInfo>,
        functionCompletionItems: Array<LuaFiledCompletionInfo>, isLast: boolean
    ): Array<LuaFiledCompletionInfo> {
        fcoitems.forEach(item => {
            if (key != null) {
                key = key.toLocaleLowerCase()
            }
            if (key == "self") {
                var xx = 1
            } else {
                var items: Map<string, LuaFiledCompletionInfo> = item.items

                item.items.forEach((v, k) => {

                    if (key == null) {
                        if (v.checkType(tipType)) {
                            functionCompletionItems.push(v)
                        }

                    } else {
                        if (isLast) {
                            var lable: string = v.label.toLocaleLowerCase();
                            var tempKey: string = key.toLocaleLowerCase()
                            if (lable.indexOf(tempKey) > -1 && v.checkType(tipType)) {
                                functionCompletionItems.push(v)
                            }
                        } else {

                            if (v.label.toLocaleLowerCase() == key && v.checkType(tipType)) {
                                functionCompletionItems.push(v)
                            }
                        }

                    }
                })
            }


        })




        return functionCompletionItems;
    }

    public addGlogCompletionItems(items: Array<LuaFiledCompletionInfo>) {
        this.fileCompletionItemManagers.forEach((v, k) => {
            if (k != LuaParse.checkTempFilePath) {
                items.push(v.luaGolbalCompletionInfo)
            }

        })
        this.fileCompletionItemManagers.forEach((v, k) => {
            if (k != LuaParse.checkTempFilePath) {
                items.push(v.luaFunCompletionInfo)
            }

        })
    }

    /**
     * 忽略end
     */
    private ignoreEnd(index: number, tokens: Array<TokenInfo>) {
        var lp: LuaParse = LuaParse.lp;
        var endCount: number = 1;
        while (index >= 0) {
            var token: TokenInfo = tokens[index]
            index--;
            if (lp.consume('do', token, TokenTypes.Keyword) ||
                lp.consume('then', token, TokenTypes.Keyword) ||
                lp.consume('function', token, TokenTypes.Keyword)
            ) {
                endCount--;
                if (endCount == 0) {
                    return index;
                }

            } else if (lp.consume('end', token, TokenTypes.Keyword)) {
                endCount++;
            }
        }
        return index

    }


    public getCurrentFunctionName(tokens: Array<TokenInfo>, uri: Uri): Array<string> {
        var lp: LuaParse = LuaParse.lp;
        //检查end
        var maxLine = tokens.length
        var index = tokens.length - 1
        var funNames: Array<string> = new Array<string>();
        var endCount = 0;
        var lastEndCount = 0;
        var isBreak:boolean = false
        while (index >= 0) {
            if(isBreak) break
            var token: TokenInfo = tokens[index]
            if (lp.consume('end', token, TokenTypes.Keyword)) {
                index--;
                index = this.ignoreEnd(index, tokens)
            }
            else if (lp.consume("function", token, TokenTypes.Keyword)) {

                var starIndex = 0;
                var endIndex = 0;
                //获得参数列表
                var nextIndex = index + 1
                //往下找 <maxLine 表示参数列表
                while (nextIndex < maxLine) {
                    var nextToken: TokenInfo = tokens[nextIndex]
                    if (lp.consume('(', nextToken, TokenTypes.Punctuator)) {
                        //先确定有参数并且不是在编写参数
                        starIndex = nextIndex;
                    }
                    if (lp.consume(')', nextToken, TokenTypes.Punctuator)) {
                        //先确定有参数并且不是在编写参数
                        endIndex = nextIndex;
                        break;
                    }
                    nextIndex++;
                }
                var isArgFun: boolean = false

                if (starIndex - index == 1) {
                    isArgFun = true
                }
                var funName: string = "";
                if (starIndex <= endIndex && starIndex != 0) {

                    if (isArgFun) {

                        funName = "TempFun_" + token.line + "_" + token.lineStart
                        funNames.push(funName);
                        // console.log(funName)
                    } else {

                        var findex: number = index + 1;
                        //找到方法名
                        var functionNameToken: TokenInfo = tokens[findex];
                        funName = funName + functionNameToken.value;
                        while (true) {
                            findex++;

                            var nextToken: TokenInfo = tokens[findex]
                            if (
                                lp.consume('.', nextToken, TokenTypes.Punctuator) ||
                                lp.consume(':', nextToken, TokenTypes.Punctuator)
                            ) {
                                findex++;
                                funName += nextToken.value;
                                functionNameToken = tokens[findex];
                                funName = funName + functionNameToken.value;
                                isBreak = true
                            }
                            if (findex == starIndex) {
                               
                                break;
                            }
                        }
                        //   console.log(funName)
                        funNames.push(funName);
                        //找出参数列表
                    }

                }
            }
            index--;
        }
        // console.log("==================")
        // console.log(funNames)
        var newFunNames: Array<string> = new Array<string>();
        for (var i = 0; i < funNames.length; i++) {
            var fn = "";
            for (var j = funNames.length - 1; j > i; j--) {
                fn += funNames[j] + "->";
            }
            fn += funNames[i]
            newFunNames.push(fn)
        }


        return newFunNames;
    }




    public getFunctionArgs(tokens: Array<TokenInfo>, uri: Uri) {
        var fcim: FileCompletionItemManager = this.getFcim(uri)
        var funNames: Array<string> = this.getCurrentFunctionName(tokens, uri)
        if (fcim == null) {
            return [];
        }
        return fcim.getSymbolArgsByNames(funNames)


    }


    public getFunctionCompletionItems(uri: Uri, keys: Array<string>):
        Array<LuaFiledCompletionInfo> {
        var completionItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        if (keys == null || keys.length == 0) return;

        var items: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        var fcoitems: Array<LuaFiledCompletionInfo> = new
            Array<LuaFiledCompletionInfo>();
        var fcim: FileCompletionItemManager = this.getFcim(uri)
        if (fcim == null) {
            return completionItems
        }
        fcoitems.push(fcim.luaFiledCompletionInfo)
        this.addGlogCompletionItems(fcoitems)
        this.getCompletionItemByKeyAndTopType(
            keys[keys.length - 1], 0,
            fcoitems,
            items, keys.length == 1)
        var index = 2;
        while (true && keys.length > 1) {
            CLog();
            if (index > keys.length) {
                if (keys.length % 2 == 0) {
                    var lasttKey: string = keys[1];


                    items = this.getLastKeyCompletionItem(lasttKey, items)
                }

                break;
            }
            var tipType: number = keys[keys.length - index] == '.' ? 1 : 2;
            index++;
            var key: string = null;
            if (keys.length - index >= 0) {
                key = keys[keys.length - index];
            }
            if (key == null) {
                continue;
            }
            index++;
            var items1: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            items.forEach(element => {
                this.getCompletionItemByKeyAndTopType(key, tipType,
                    [element], items1, index == keys.length - 1)
            });
            items = items1;

            if (items1.length == 0) {
                //没找到那么就再找找
                var lasttKey: string = keys[1];
                this.getLastKeyCompletionItem(lasttKey, items)
                break;
            } else {

                continue;
            }
        }

        for (var index = 0; index < items.length; index++) {

            var isadd: boolean = true;
            var citem: LuaFiledCompletionInfo = items[index];
            for (var index1 = 0; index1 < completionItems.length; index1++) {
                var citem1 = completionItems[index1];
                if (citem1.label == citem.label) {
                    if (citem1.kind != CompletionItemKind.Function &&
                        citem1.documentation == "" && citem.documentation != "") {
                        completionItems[index1] = citem;
                    }
                    isadd = false;
                    break;
                }

            }
            if (isadd) {
                completionItems.push(citem)
            }
        }

        return completionItems;
    }

    public getLastKeyCompletionItem(lasttKey: string, items: Array<LuaFiledCompletionInfo>): Array<LuaFiledCompletionInfo> {

        var items1: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();

        items.forEach(element => {
            element.items.forEach((v2, k2) => {
                items1.push(v2)
            })

        });
        return items1
    }


}