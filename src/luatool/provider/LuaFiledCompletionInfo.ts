import {CompletionItem,CompletionItemKind,window} from'vscode';
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from "../TokenInfo"
import vscode = require('vscode');
export class LuaFiledCompletionInfo extends CompletionItem {
    public isLocal:boolean;
    public isShow:boolean;
    public items:Map<string,LuaFiledCompletionInfo> ;
    public lowerCaseItems:Map<string,LuaFiledCompletionInfo> ;
    
    public type:Array<number>;
    public parent:LuaFiledCompletionInfo;
    public  params:Array<string>;
    public comments: Array<LuaComment>;
    public uri:vscode.Uri;
    public position:vscode.Position;
    
    constructor(label:string,kind:CompletionItemKind,uri:vscode.Uri,position:vscode.Position)
    {
       
        super(label,kind);
        this.isShow = true;
        this.documentation = ""
        this.items = new Map<string,LuaFiledCompletionInfo>();
        this.lowerCaseItems = new Map<string,LuaFiledCompletionInfo>();
        this.type = new Array<number>();
        this.uri = uri;
        this.position = position;
    }
    public checkType(t:number)
    {
        
        for(var i:number= 0; i < this.type.length;i++)
        {
            if(this.type[i] == t)
            {
                return true
            }
        }
        return false
        

    }
    public setType(t:number)
    {
        this.type.forEach(element => {
            if(element == t) {
                return;
            }
        });
        this.type.push(t);
    }

    public getItemByKey(key:string,islowerCase:boolean =false):LuaFiledCompletionInfo
    {
        if(this.items.has(key))
        {
            return this.items.get(key)
        }else if(islowerCase)
        {
            key = key.toLocaleLowerCase()
            if( this.lowerCaseItems.has(key))
            {
                return this.lowerCaseItems.get(key)
            }

        }else
        {

        }
        return null
    }

    public addItem(item:LuaFiledCompletionInfo)
    {
        item.parent = this;
        this.items.set(item.label,item)
       
        this.lowerCaseItems.set(item.label.toLocaleLowerCase(),item)
    }


}