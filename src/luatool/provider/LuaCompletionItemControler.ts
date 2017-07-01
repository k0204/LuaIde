import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo"
import { LuaCompletionItemGolbalControler } from "../provider/LuaCompletionItemGolbalControler"
import { LuaCompletionItemProviderUtils } from "../provider/LuaCompletionItemProviderUtils"
import vscode = require('vscode');
import { LuaParse } from "../LuaParse";
import { FileCompletionItemManager } from "../manager/FileCompletionItemManager";
import { LuaGolbalCompletionManager } from "../manager/LuaGolbalCompletionManager";
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems";
import { LuaCompletionItemFunControler } from "./LuaCompletionItemFunControler";
import { CompletionItemKind } from "vscode";

export class LuaCompletionItemControler {
    private static _LuaCompletionItemControler: LuaCompletionItemControler
    private luaCompletionItemProviderUtils:LuaCompletionItemProviderUtils;
    private luaFileCompletionItems: LuaFileCompletionItems;
    private luaCompletionItemGolbalControler:LuaCompletionItemGolbalControler;
    private luaCompletionItemFunControler:LuaCompletionItemFunControler;
    constructor() {
        this.luaFileCompletionItems = LuaFileCompletionItems.getLuaFileCompletionItems()
        this.luaCompletionItemGolbalControler = LuaCompletionItemGolbalControler.getIns();
        this.luaCompletionItemProviderUtils = LuaCompletionItemProviderUtils.getIns();
        this.luaCompletionItemFunControler = LuaCompletionItemFunControler.getIns(this);
    }
    public static getIns() {
        if (LuaCompletionItemControler._LuaCompletionItemControler == null) {
            LuaCompletionItemControler._LuaCompletionItemControler = new LuaCompletionItemControler()
        }
        return LuaCompletionItemControler._LuaCompletionItemControler
    }
    /**
     * 根据keys 和 方法名称集合 获取对应的 LuaFiledCompletionInfo
     * @param keys 
     * @param funNames 
     */
    public getLuaCompletionsByKeysAndFunNames(
        uri: vscode.Uri, keys: Array<string>,
        funNames: Array<string>,
        citems: Array<LuaFiledCompletionInfo>,isFirst:boolean) {
        var keys = keys.reverse()
        var fcim: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(uri.path)
        if (fcim == null) return
        if (keys.length == 1) {

            if (funNames) {
                for (var index = 0; index < funNames.length; index++) {
                    var fname: string = funNames[index];
                    var funCompletionItem = fcim.luaFunFiledCompletions.get(fname)
                    if (funCompletionItem) {
                        this.getCompletionAloneByItemIndexOfKey(funCompletionItem, keys[0], citems)
                    }

                }
            }
            this.getCompletionAloneByItemIndexOfKey(fcim.luaFunCompletionInfo, keys[0], citems)
            this.getCompletionAloneByItemIndexOfKey(fcim.luaFileGolbalCompletionInfo, keys[0], citems)
            if(isFirst){
                this.getCompletionAloneByItemIndexOfKey(LuaGolbalCompletionManager.rootCompletion, keys[0], citems)
            }
           
            
        } else {
            var keyStr = keys.join("")
            var rootItem = this.getFirstCompletionInfo(fcim, keys[0], funNames)
             var reItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            if(rootItem == null){
                 this.luaCompletionItemProviderUtils.mergeItems(reItems,this.luaCompletionItemProviderUtils.getItemsByModuleName(keys[0]))
            }else{
                reItems = this.checkReferenceValue(rootItem)
                if(reItems.length == 0){
               
                  this.luaCompletionItemProviderUtils.mergeItems(reItems,this.luaCompletionItemProviderUtils.getItemsByModuleName(keys[0]))

                }
                if(reItems.indexOf(rootItem) == -1){
                    reItems.push(rootItem)
                }
                
            }
            var gitems = this.luaCompletionItemGolbalControler.getFirstItem(keys[0])
            if(gitems.length > 0){
                this.luaCompletionItemProviderUtils.mergeItems(reItems,gitems)
            }
           
            
            if (reItems.length > 0) {
                

                var index: number = 3
                while (index < keys.length) {

                    var key = keys[index - 1]
                    if (key == null) {
                        break
                    }
                    var tempItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
                    reItems.forEach(item => {
                        var tItem: LuaFiledCompletionInfo = item.getItemByKey(key, true)
                        if(tItem==null){
                           tItem = this.luaCompletionItemProviderUtils.getParentItemByKey(item,key)
                        }
                        if (tItem) {
                            tempItems.push(tItem)
                            var refItems: Array<LuaFiledCompletionInfo> = this.checkReferenceValue(tItem)
                            refItems.forEach(e => {
                                tempItems.push(e)
                            })
                        }
                    })
                    reItems = tempItems;
                    index += 2
                }


                reItems.forEach(element => {
                    if (element) {
                        element.getItems().forEach((v, k) => {
                            if (citems.indexOf(v) == -1) {
                                citems.push(v)
                            }
                        })
                        //parent element  查找父类元素
                        var parentClassItems:Array<Map<string,LuaFiledCompletionInfo>> = new Array<Map<string,LuaFiledCompletionInfo>>()
                       this.luaCompletionItemProviderUtils.getParentItems(element,parentClassItems)
                       for (var index = 0; index < parentClassItems.length; index++) {
                           var parentItems = parentClassItems[index];
                            parentItems.forEach((v, k) => {
                            if (citems.indexOf(v) == -1) {
                                citems.push(v)
                            }
                        })
                       }


                        if (element.uri != null && element.uri.path == uri.path) {
                            var tempKeys: Array<string> = new Array<string>()
                            var item = element
                            while (true) {
                                tempKeys.push(item.label)

                                if (item.parent) {
                                    item = item.parent
                                    if (item.completionFunName != null) { break; }
                                } else {
                                    item = null
                                }
                                if (item == null || item.label == "") {
                                    break

                                }
                            }

                            var tempKeys = tempKeys.reverse()
                            var findKeys: Array<string> = new Array<string>()
                            for (var k = 0; k < tempKeys.length; k++) {
                                findKeys.push(tempKeys[k])
                                findKeys.push(".")
                            }

                            var findKeyStr = tempKeys[tempKeys.length - 1]
                            var ccitems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>()
                            var findKeysStr = findKeys.join("");
                            if (keyStr != findKeysStr) {


                                if (findKeys.length > 0) {
                                    this.getLuaCompletionsByKeysAndFunNames(element.uri, findKeys.reverse(), funNames, ccitems,false)
                                    ccitems.forEach(v => {
                                        if (citems.indexOf(v) == -1) {
                                            citems.push(v)
                                        }
                                    })
                                }
                            }
                        }

                    }

                });


            }
        }

    }
   

    /**
     * 根据方法名和keys 获得item的值
     */
    public getReferenceValueByKeyAndFunName(rootItem: LuaFiledCompletionInfo,
        funName: string, keys: Array<string>): Array<LuaFiledCompletionInfo> {
        //获取方法名字集合
        var funNames: Array<string> = this.getFunNames(funName)
        var fcim: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(rootItem.uri.path)
        var valueItem: LuaFiledCompletionInfo = null
        funNames = funNames.reverse()
        var valueItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        if (funNames.length == 1 && funNames[0] == "__g__") {

            valueItem = this.getLuaCompletionByKeys(fcim.luaFileGolbalCompletionInfo, keys, true)

            if (valueItem == null) {
                valueItem = this.getLuaCompletionByKeys(fcim.luaGolbalCompletionInfo, keys, true)
            }
            if (valueItem) {
                valueItems.push(valueItem)
            }
        } else {
            for (var index = 0; index < funNames.length; index++) {
                var fname: string = funNames[index]
                var funLuaCompletion = fcim.luaFunFiledCompletions.get(funName)
                if (funLuaCompletion) {
                    valueItem = this.getLuaCompletionByKeys(funLuaCompletion, keys, false)
                    if (valueItem) {
                        valueItems.push(valueItem)
                        break
                    }
                } else {
                    break;
                }

            }

            //如果在方法内没找到那么就找

            valueItem = this.getLuaCompletionByKeys(fcim.luaFileGolbalCompletionInfo, keys, true)

            if (valueItem == null) {
                valueItem = this.getLuaCompletionByKeys(fcim.luaGolbalCompletionInfo, keys, true)
            }
            if (valueItem) {
                valueItems.push(valueItem)
            }
        }
        //如果还没找到 就全部文件中找  这里采用一点小技巧 这里先去找keys[0] 值检查下
        //有没有对应的文件 如果没有再进行全局检查
        // if (valueItem == null) {
            this.luaCompletionItemProviderUtils.mergeItems(valueItems, this.luaCompletionItemProviderUtils.getItemsByModuleName(keys[0]))
       
       

        // }


        // if (valueItem == null) {
        var fileCompletionItemManagers: Map<string, FileCompletionItemManager> = LuaParse.lp.luaInfoManager.fileCompletionItemManagers
        for (var info of fileCompletionItemManagers) {
            valueItem = this.getLuaCompletionByKeys(info[1].luaGolbalCompletionInfo, keys, true)
            if (valueItem != null) {
                valueItems.push(valueItem)
            }

        }

        // }

        return valueItems
    }
    /**
     * 根据keys 获得具体的 item 
     * @isValue 是否是需要检查有值的
     */
    public getLuaCompletionByKeys(item: LuaFiledCompletionInfo, keys: Array<string>, isValue: boolean): LuaFiledCompletionInfo {
        var index: number = 0
        while (index < keys.length) {
            item = item.getItemByKey(keys[index])
            if (item == null) {
                break
            }
            index += 2;
        }
        // if (item != null && isValue) {
        //     if (item.requireReferencePath ||
        //         item.requireReferenceFileds ||
        //         item.referenceCompletionKeys ||
        //         item.referenceCompletionFunKeys ||
        //         item.completionStringValue) {
        //         return item
        //     } else {
        //         return null
        //     }
        // } else {
        //     return item
        // }
        return item

    }



    public checkReferenceValue(item: LuaFiledCompletionInfo): Array<LuaFiledCompletionInfo> {
        var reItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        //require("xxx.xxx.xx")
        if(item.valueReferenceModulePath == null){
         var rferenceItems = null;
        if (item.requireReferencePath) {
            for (var index = 0; index < item.requireReferencePath.length; index++) {
                var path = item.requireReferencePath[index];
                var items: Array<LuaFiledCompletionInfo> = this.luaCompletionItemProviderUtils.getCompletionByModulePath(path)
                items.forEach(e => {
                    reItems.push(e)
                })
            }
        }

       
        rferenceItems = this.getRferenceFiledsValue(item)
        this.luaCompletionItemProviderUtils.mergeItems(reItems, rferenceItems)
        }else{
            var items: Array<LuaFiledCompletionInfo> = this.luaCompletionItemProviderUtils.getCompletionByModulePath(item.valueReferenceModulePath)
                items.forEach(e => {
                    reItems.push(e)
                })
        }
        rferenceItems = this.getReferenceCompletionValue(item)
        this.luaCompletionItemProviderUtils.mergeItems(reItems, rferenceItems)
        rferenceItems = this.luaCompletionItemFunControler.getReferenceCompletionFunValue(item)
         this.luaCompletionItemProviderUtils.mergeItems(reItems, rferenceItems)
        return reItems

    }



    /**
     *  //require(mopath.path1)
     * 查找require 的返回值 路径为一个变量
    */
    public getRferenceFiledsValue(item: LuaFiledCompletionInfo): Array<LuaFiledCompletionInfo> {

        if (item.requireReferenceFileds) {
            var requireReferenceItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            item.requireReferenceFileds.forEach((v, k) => {
                var ritems: Array<LuaFiledCompletionInfo> = this.getReferenceValueByKeyAndFunName(item, k, v)
                if (ritems) {
                    this.luaCompletionItemProviderUtils.mergeItems(requireReferenceItems, ritems)
                }
            })
            var items: Array<LuaFiledCompletionInfo> = this.getRferenceFiledsStr(requireReferenceItems)
            return items
        }
        return null
    }
    /**
     * 查找require 的返回值 路径为一个变量 的变量值
     */
    public getRferenceFiledsStr(requireReferenceItems: Array<LuaFiledCompletionInfo>) {
        var reItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        for (var index = 0; index < requireReferenceItems.length; index++) {
            var element = requireReferenceItems[index];
            if (element.completionStringValue) {
                var items: Array<LuaFiledCompletionInfo> = this.luaCompletionItemProviderUtils.getCompletionByModulePath(element.completionStringValue)
                if (items) {
                    items.forEach(e => {
                        reItems.push(e)
                    })
                }

            } else {

                //如果不是需要再进行查找
                var valueItems: Array<LuaFiledCompletionInfo> = this.checkReferenceValue(element)
                if (valueItems) {
                    var items: Array<LuaFiledCompletionInfo> = this.getRferenceFiledsStr(valueItems)
                    this.luaCompletionItemProviderUtils.mergeItems(reItems, items)
                }

            }
        }
        return reItems
    }
   
   
    /**
     *  local data = data1
     * 获取 一个变量是另外一个变量赋值的 变量集合
     */
    public getReferenceCompletionValue(item: LuaFiledCompletionInfo): Array<LuaFiledCompletionInfo> {
        // if(item.referenceCompletionKeys){

        if (item.referenceCompletionKeys) {
            var requireReferenceItems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            item.referenceCompletionKeys.forEach((v, k) => {
                 var keys:Array<string> = new Array<string>();
                for (var index = 0; index < v.length-1; index++) {
                    var key = v[index];
                    keys.push(key)
                }
                if(keys.length ==0){
                    keys = v
                }
                var valueFunName:string = v[v.length-1]
                var funNames:Array<string> = this.getFunNames(k)
               var citems: Array< LuaFiledCompletionInfo> = new Array< LuaFiledCompletionInfo>();
                this.getLuaCompletionsByKeysAndFunNames(item.uri, keys.reverse(),funNames,citems,false)
                citems.forEach(v1=>{
                    if(v1.label == valueFunName){
                        requireReferenceItems.push(v1)
                    }

                })




                // var ritems: Array<LuaFiledCompletionInfo> = this.getReferenceValueByKeyAndFunName(item, k, v)
                // if (ritems) {
                //     ritems.forEach(v => {
                //         var rItems1 = this.checkReferenceValue(v)
                //         if (rItems1) {
                //             this.mergeItems(requireReferenceItems, rItems1)
                //         }
                //     })
                //     this.mergeItems(requireReferenceItems, ritems)

                // }
            })

            return requireReferenceItems
        }
        return null

    }

   


    public getFirstCompletionInfo(fcim: FileCompletionItemManager, key: string, funNames: Array<string>): LuaFiledCompletionInfo {
        //先
        //  LuaParse.lp.luaInfoManager.fileCompletionItemManagers.forEach((v,f)=>{
        //     v.luaGolbalCompletionInfo
        //  })
        for (var index = 0; index < funNames.length; index++) {
            var funName = funNames[index];
            var funCompletionItem: LuaFiledCompletionInfo = fcim.luaFunFiledCompletions.get(funName)
            if (funCompletionItem) {
                //找到root 的item
                var item: LuaFiledCompletionInfo = funCompletionItem.getItemByKey(key, false)
                if (item) {
                    return item;
                }
            }
        }
        var item = fcim.luaFileGolbalCompletionInfo.getItemByKey(key, true)
        if (item == null) {
           item = fcim.luaGolbalCompletionInfo.getItemByKey(key, true)
        }
        
        if (item) {
            return item;
        }
       


    }

    public getCompletionByItemIndexOfKey(fcim: FileCompletionItemManager, key: string, funNames: Array<string>): Array<LuaFiledCompletionInfo> {

        return null
    }
    /**
     * 获得不重复的的 Completion
     * @param item 
     * @param key 
     * @param cItems 
     */
    public getCompletionAloneByItemIndexOfKey(item: LuaFiledCompletionInfo,
        key: string,
        cItems: Array< LuaFiledCompletionInfo>) {
        key = key.toLowerCase();
        item.lowerCaseItems.forEach((v) => {
            if (cItems.indexOf(v) == -1) {
                    cItems.push( v)
            }
        })
    }

 
    public getFunNames(funName: string): Array<string> {
        var funNames: Array<string> = new Array<string>()
        if (funName.indexOf("->") > -1) {
            var fnames: Array<string> = funName.split("->")
            for (var index = 0; index < fnames.length; index++) {
                var fname = ""
                for (var j = 0; j <= index; j++) {
                    fname += fnames[j] + "->";
                }
                fname = fname.substring(0, fname.length - 2)
                funNames.push(fname)
            }
        } else {
            funNames.push(funName)
        }
        return funNames
    }




}