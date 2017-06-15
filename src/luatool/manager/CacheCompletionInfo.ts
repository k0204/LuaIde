//缓存 避免提示chuanghuan
import { LuaFiledCompletionInfo } from "../provider/LuaFiledCompletionInfo";
import { CompletionItem,CompletionItemKind } from "vscode";

export class CacheCompletionInfo {
    public static ins:CacheCompletionInfo;
    public static getIns(){
        if(CacheCompletionInfo.ins == null){
            CacheCompletionInfo.ins = new CacheCompletionInfo();
        }
        return CacheCompletionInfo.ins;
    }
    private infos:Array<CompletionItem>;
    public constructor(){
        this.infos = new  Array<LuaFiledCompletionInfo>()
    }
    public getItem(item:LuaFiledCompletionInfo){
        var newItem:CompletionItem = null;
        if(this.infos.length==0){
            newItem = new CompletionItem(item.funLable,CompletionItemKind.Function);
        }else{
            newItem = this.infos.pop();
        }
        newItem.label = item.funLable;
        newItem.documentation = item.documentation;
        newItem.insertText = item.funvSnippetString == null ?item.funLable : item.funvSnippetString;
        return newItem;
    }
    public pushItems(items:Array<CompletionItem>){
        items.forEach(v=>{
            this.infos.push(v)
        })
    }

}
