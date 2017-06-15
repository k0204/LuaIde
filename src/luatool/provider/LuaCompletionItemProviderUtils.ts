import { LuaFiledCompletionInfo } from "./LuaFiledCompletionInfo";
import { LuaFileCompletionItems } from "../manager/LuaFileCompletionItems"
import vscode = require('vscode');
import { FileCompletionItemManager } from "../manager/FileCompletionItemManager";
import { LuaParse } from "../LuaParse";
export class LuaCompletionItemProviderUtils {
    public static _LuaCompletionItemProviderUtils:LuaCompletionItemProviderUtils;
    public static getIns(){
        if(LuaCompletionItemProviderUtils._LuaCompletionItemProviderUtils == null){
            LuaCompletionItemProviderUtils._LuaCompletionItemProviderUtils = new LuaCompletionItemProviderUtils();
        }
        return LuaCompletionItemProviderUtils._LuaCompletionItemProviderUtils
    }
    private luaFileCompletionItems: LuaFileCompletionItems;
    constructor(){
        this.luaFileCompletionItems = LuaFileCompletionItems.getLuaFileCompletionItems()
        
    }
     /**
     * 根据路径获取completions
     */
    public getCompletionByModulePath(modulePath: string): Array<LuaFiledCompletionInfo> {
        var ritems: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        
        var uri: vscode.Uri = this.luaFileCompletionItems.getUriCompletionByModuleName(modulePath)
        if (uri) {
            var referenceCompletionManager: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(uri.path)
            var items: Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
            if (referenceCompletionManager.rootCompletionInfo != null) items.push(referenceCompletionManager.rootCompletionInfo)
            if (referenceCompletionManager.rootFunCompletionInfo != null) items.push(referenceCompletionManager.rootFunCompletionInfo)
            return items

        }else{
            var moduleInfos = modulePath.split('.');
            if(moduleInfos.length > 0){
                return this.getItemsByModuleName(moduleInfos[0])
            }
           
        }
        return null
    }
     public getItemsByModuleName(moduleName){
        var reItems:Array<LuaFiledCompletionInfo> = new Array<LuaFiledCompletionInfo>();
        var lfcis: LuaFileCompletionItems = LuaFileCompletionItems.getLuaFileCompletionItems()
         var paths: Array<string> = lfcis.getUrisByModuleName(moduleName)
        if (paths) {
            for (var index = 0; index < paths.length; index++) {
                    var fcim: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(paths[index])
                    if(fcim.rootCompletionInfo){
                        reItems.push(fcim.rootCompletionInfo)    
                    }else{
                       var item :LuaFiledCompletionInfo =  fcim.luaGolbalCompletionInfo.getItemByKey(moduleName,true)
                       if(item){
                           reItems.push(item)
                       }else{
                            LuaParse.lp.luaInfoManager.fileCompletionItemManagers.forEach((v,k)=>{
                                var gitem =  v.luaGolbalCompletionInfo.getItemByKey(moduleName,true)
                                if(gitem){
                                    if(reItems.indexOf(gitem) == -1){
                                        reItems.push(gitem)
                                    }
                                }

                            })
                       }

                    }
                    if(fcim.rootFunCompletionInfo){
                        reItems.push(fcim.rootFunCompletionInfo)
                    }else{
                         LuaParse.lp.luaInfoManager.fileCompletionItemManagers.forEach((v,k)=>{
                                var gitem =  v.luaFunCompletionInfo.getItemByKey(moduleName,true)
                                if(gitem){
                                    if(reItems.indexOf(gitem) == -1){
                                        reItems.push(gitem)
                                    }
                                }

                            })
                    }
                    
                    
            } 
        } 
        return reItems;

    }
     public getParentItems(completion:LuaFiledCompletionInfo,parentCompletion:Array<Map<string,LuaFiledCompletionInfo>>){
        if(completion.parentModulePath != null){
             var uri: vscode.Uri = this.luaFileCompletionItems.getUriCompletionByModuleName(completion.parentModulePath)
            if (uri) {
                var referenceCompletionManager: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(uri.path)
               
               if(referenceCompletionManager.rootCompletionInfo){
                    parentCompletion.push(referenceCompletionManager.rootCompletionInfo.getItems())
                    parentCompletion.push(referenceCompletionManager.rootFunCompletionInfo.getItems())
                    if(referenceCompletionManager.rootCompletionInfo.parentModulePath != null){
                        this.getParentItems(referenceCompletionManager.rootCompletionInfo,parentCompletion)

                    }
               } 
                
            }
        }
    }
    public getParentItemByKey(completion:LuaFiledCompletionInfo,key:string):LuaFiledCompletionInfo{
         var uri: vscode.Uri = this.luaFileCompletionItems.getUriCompletionByModuleName(completion.parentModulePath)
            if (uri) {
                var referenceCompletionManager: FileCompletionItemManager = LuaParse.lp.luaInfoManager.getFcimByPathStr(uri.path)
               
               if(referenceCompletionManager.rootCompletionInfo){
                   var item =referenceCompletionManager.rootCompletionInfo.getItemByKey(key)
                   if(item){
                       return item
                   }else{
                       if(referenceCompletionManager.rootCompletionInfo.parentModulePath != null){
                          return this.getParentItemByKey(referenceCompletionManager.rootCompletionInfo,key)
                       }
                   }
                   
               } 
                
            }
            return null;
    }
       /**
     * 合并两个list
     */
    public mergeItems(items1: Array<LuaFiledCompletionInfo>, items2: Array<LuaFiledCompletionInfo>) {
        if (items2) {
            items2.forEach(item => {
                if (items1.indexOf(item) == -1) {
                    items1.push(item)
                }

            })
        }

        return items1
    }
}