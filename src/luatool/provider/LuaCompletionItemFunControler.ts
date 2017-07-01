import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import vscode = require('vscode');
import { LuaParse } from "../LuaParse";
import { FileCompletionItemManager } from "../manager/FileCompletionItemManager";
import { LuaGolbalCompletionManager } from "../manager/LuaGolbalCompletionManager";
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems";
import { CompletionItemKind } from "vscode";
import { LuaInfoManager } from "../LuaInfoManager";
import { LuaCompletionItemControler } from "./LuaCompletionItemControler";
import { LuaCompletionItemProviderUtils } from "./LuaCompletionItemProviderUtils";
export class LuaCompletionItemFunControler {
    private static _LuaCompletionItemFunControler: LuaCompletionItemFunControler;
    private luaInfoManager: LuaInfoManager;
    private luaCompletionItemControler: LuaCompletionItemControler;
    private luaCompletionItemProviderUtils: LuaCompletionItemProviderUtils;
    constructor(luaCompletionItemControler: LuaCompletionItemControler) {
        this.luaInfoManager = LuaParse.lp.luaInfoManager
        this.luaCompletionItemControler = luaCompletionItemControler;
        this.luaCompletionItemProviderUtils = LuaCompletionItemProviderUtils.getIns();
    }
    public static getIns(luaCompletionItemControler: LuaCompletionItemControler) {
        if (LuaCompletionItemFunControler._LuaCompletionItemFunControler == null) {
            LuaCompletionItemFunControler._LuaCompletionItemFunControler = new LuaCompletionItemFunControler(luaCompletionItemControler)
        }
        return LuaCompletionItemFunControler._LuaCompletionItemFunControler
    }
    /**
    * local data = model:getInfo()
    * 获取一个变量是一个方法的返回值
    */
    public getReferenceCompletionFunValue(item: LuaFiledCompletionInfo): Array<LuaFiledCompletionInfo> {
        if (item.referenceCompletionFunKeys) {
            var requireReferenceItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            item.referenceCompletionFunKeys.forEach((v, k) => {
                var keys: Array<string> = new Array<string>();
                for (var index = 0; index < v.length - 1; index++) {
                    var key = v[index];
                    keys.push(key)
                }
                var valueFunName: string = v[v.length - 1]
                var funNames: Array<string> = this.luaCompletionItemControler.getFunNames(k)
                var citems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
                if (keys.length > 0) {


                    // if (funNames.length == 0 && funNames[0] == "__g__") {
                    //     //全局方法

                    // } else {
                        this.luaCompletionItemControler.getLuaCompletionsByKeysAndFunNames(item.uri, keys.reverse(), funNames, citems, false)
                    // }


                    if (valueFunName == "new") {
                        if (citems.length > 0) {
                            var newRootCompletionInfo = new LuaFiledCompletionInfo("", vscode.CompletionItemKind.Class, citems[0].uri, citems[0].position, false)
                            citems.forEach(element => {
                                newRootCompletionInfo.addItem(element)
                            });
                            requireReferenceItems.push(newRootCompletionInfo)
                        }


                    } else {
                        citems.forEach(v1 => {
                            if (v1.label == valueFunName) {
                                // if(v1.kind == CompletionItemKind.Function){
                                this.getFunctionReturnCompletionKeys(v1, requireReferenceItems)
                                // }
                            }
                        })
                    }
                } else {
                    var funItem = this.getFunByfunName(valueFunName,item,funNames)
                    if(funItem != null){
                        this.getFunctionReturnCompletionKeys(funItem, requireReferenceItems)
                    }
                }



            })

            return requireReferenceItems


        }
        return null

    }
    public getFunctionReturnCompletionGolbalByKey(key: string, item: LuaFiledCompletionInfo) {
        //现在本文件中找 如果本文件中没有找到那么就全局找  
        var fcim: FileCompletionItemManager = this.luaInfoManager.getFcimByPathStr(item.uri.path)
        if (fcim == null) return
        //如果找到多个 那么就直接忽略
    
    }

    /**
    * 获取方法的返回值
    */
    public getFunctionReturnCompletionKeys(item: LuaFiledCompletionInfo, items: Array<LuaFiledCompletionInfo>): Array<LuaFiledCompletionInfo> {
        if (item.funAnnotationReturnValue) {
            var fitems: Array<LuaFiledCompletionInfo> = this.luaCompletionItemProviderUtils.getCompletionByModulePath(item.funAnnotationReturnValue)
            this.luaCompletionItemProviderUtils.mergeItems(items, fitems)
        }
        else if (item.functionReturnCompletionKeys) {
            var citems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            item.functionReturnCompletionKeys.forEach((v, k) => {
                var funNames: Array<string> = this.luaCompletionItemControler.getFunNames(k)
                var keys: Array<string> = new Array<string>()
                if (v.length == 1) {
                    keys.push(v[0])
                } else {
                    for (var index = 0; index < v.length - 1; index++) {
                        keys.push(v[index])
                    }
                }

                var keyName = v[v.length - 1]
                // keys.push(".")
                this.luaCompletionItemControler.getLuaCompletionsByKeysAndFunNames(item.uri, keys.reverse(), funNames, citems, false)
                citems.forEach(element => {
                    if (element.label == keyName) {

                        var reItems = this.luaCompletionItemControler.checkReferenceValue(element)
                        this.luaCompletionItemProviderUtils.mergeItems(items, reItems)
                        items.push(element)
                    }

                });

            })

        }
        return items
    }


    public getFunByfunName(functionName: string, item: LuaFiledCompletionInfo, functionNames: Array<string>):LuaFiledCompletionInfo {
        var fcim: FileCompletionItemManager = this.luaInfoManager.getFcimByPathStr(item.uri.path)
        if (fcim == null) return
        functionNames = functionNames.reverse();
        for (var index = 0; index < functionNames.length; index++) {
            var fname = functionNames[index];
            var fitem = fcim.luaFunFiledCompletions.get(fname)
            if(fitem != null){
                var targetItem =fitem.getItemByKey(functionName)
                if(targetItem != null){
                    return targetItem
                }

            }
        }
        
        //全局查找
        this.luaInfoManager.fileCompletionItemManagers.forEach((v,k)=>{
             var targetItem = v.luaFunCompletionInfo.getItemByKey(functionName)
                if(targetItem != null){
                    return targetItem
                }
        })


    }

}