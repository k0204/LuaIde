import { CompletionItem, CompletionItemKind, window } from 'vscode';

import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from "../TokenInfo"
import vscode = require('vscode');
import { LuaSymbolInformation } from "../manager/LuaSymbolInformation";

export class LuaFiledCompletionInfo extends CompletionItem {




    public isLocal: boolean;
   
    private items: Map<string, LuaFiledCompletionInfo>;
    public lowerCaseItems: Map<string, LuaFiledCompletionInfo>;
    public symbol:LuaSymbolInformation;
    public type: Array<number>;
    public parent: LuaFiledCompletionInfo;
    public params: Array<string>;
    public comments: Array<LuaComment>;
    public uri: vscode.Uri;
    public position: vscode.Position;
    public isFun: boolean;
    public isNewVar:boolean=false;
    public isLocalFunction:boolean = null;
    //方法根 如果当前方法还有上层方法 那么记录下 便于查找
    public funParentLuaCompletionInfo;

    //用以统计全局变量的文件引用
    public golbalUris: Array<string>;

    //父类路径 这里没有存LuaFiledCompletionInfo 是因为变化较大 不利于存储
    public parentModulePath:string = null;
    public valueReferenceModulePath:string = null;
    // //如果是全局变量 设置是否为创建的 用于定位
    // public golbalCompletionIsNew:boolean;

    //-----------------------这里记录的很多的辅助信息 是因为 在没有全部解析完毕时无法找到对应的completion
    //-----------------------记录这些值的原因是为了更快的去找到对应的Completion 没有选择及时分析的原因是如果关联文件
    //-----------------------过多 那么这一过程会打开很多的文档速度较慢而且不能确保每个文件都是正确的
    //-----------------------当前这么做的缺点是占用了一部分的内存
    // 引用的值为一个字符串
    public completionStringValue: string;
    //直接获取的的modulePath
    public requireReferencePath: Array<string>;
    //require 中用到的使用的是变量 记录keys 用于查找modulePath
    public requireReferenceFileds: Map<string, Array<string>>;

    //completion 的值为另外一个Completion 
    public referenceCompletionKeys: Map<string, Array<string>>;



   
    //completion 的值为一个方法的返回值  funAnnotationReturnValue|functionReturnCompletionKeys 配合使用
    public referenceCompletionFunKeys: Map<string, Array<string>>;
    //  为一个function  返回值的 keys 
    public functionReturnCompletionKeys: Map<string,Array<string>>;
    //注释的方法返回值 优先于 functionReturnCompletionKeys
    public funAnnotationReturnValue:string=null;

    public completionFunName:string = null
    //显示fun的全
    public funLable:string = null;
    public funvSnippetString:vscode.SnippetString = null;
    //-----------------------------------------------------------------------
    constructor(label: string, kind: CompletionItemKind, uri: vscode.Uri, position: vscode.Position, isFun: boolean) {

        super(label, kind);
        this.isFun = isFun
        
        this.documentation = ""
        this.type = new Array<number>();
        this.uri = uri;
        this.position = position;
        this.items = new Map<string, LuaFiledCompletionInfo>();
        this.lowerCaseItems = new Map<string, LuaFiledCompletionInfo>();
    }

    public checkType(t: number) {

        for (var i: number = 0; i < this.type.length; i++) {
            if (this.type[i] == t) {
                return true
            }
        }
        return false


    }
    public setType(t: number) {
        var isAdd = true
        this.type.forEach(element => {
            if (element == t) {
                isAdd = false
                return;
            }
        });
        if (isAdd) {
            this.type.push(t);
        }

    }
 

    public getItems():Map<string, LuaFiledCompletionInfo>{
         return this.items
    }
   

    public clearItems(){
        this.items.clear();
        this.lowerCaseItems.clear();
    }
    public getItemByKey(key: string, islowerCase: boolean = false): LuaFiledCompletionInfo {
        if (this.items == null) {
            return null
        }
        if (this.items.has(key)) {
            return this.items.get(key)
        } else if (islowerCase) {
            key = key.toLocaleLowerCase()
            if (this.lowerCaseItems.has(key)) {
                return this.lowerCaseItems.get(key)
            }

        } else {

        }
        return null
    }

    public addItem(item: LuaFiledCompletionInfo) {

        item.parent = this;
        this.items.set(item.label, item)
        this.lowerCaseItems.set(item.label.toLocaleLowerCase(), item)
    }
    public delItem(key: string) {
        if (this.items.has(key)) {
            this.items.delete(key)
            this.lowerCaseItems.delete(key.toLocaleLowerCase())
        }
    }
    public delItemToGolbal(item: LuaFiledCompletionInfo) {

        var citem: LuaFiledCompletionInfo = this.getItemByKey(item.label)
        if (citem != null) {
            var path = item.uri.path
            var count = 0;
            if (item.items.size == 0) {
                var index = citem.golbalUris.indexOf(item.uri.path)
                if (index > -1) {
                    citem.golbalUris.splice(index, 1)
                }
                if (citem.golbalUris.length <= 0) {
                    this.delItem(citem.label)
                }
            } else {
                item.items.forEach((v, k) => {
                    citem.delItemToGolbal(v)
                })
                if(citem.items.size == 0){
                    this.delItem(citem.label)
                }
            }
        }
    }
    public addItemToGolbal(item: LuaFiledCompletionInfo) {

        var citem: LuaFiledCompletionInfo = this.getItemByKey(item.label)

        if (citem == null) {
            var newItem :LuaFiledCompletionInfo = new LuaFiledCompletionInfo(item.label,item.kind,null,null,false)
            citem = newItem
            this.addItem(newItem);
        }
        if (citem.golbalUris == null) {
            citem.golbalUris = new Array<string>()
        }
        var count = 0;
        if (item.items.size == 0) {
            citem.golbalUris.push(item.uri.path)
        } else {
            item.items.forEach((v, k) => {
                citem.addItemToGolbal(v)
            })
        }

    }



    public setCompletionStringValue(value: string) {
        this.completionStringValue = value
    }
    //require 路径集合 字符串集合
    public addRequireReferencePath(path: string) {
        if (path) {
            if (this.requireReferencePath == null) {
                this.requireReferencePath = new Array<string>();
            }
            if(this.requireReferencePath.indexOf(path) == -1){
                this.requireReferencePath.push(path)
            }
        }

    }
    //require 变量引用 用于查找 modulePath
    public addRequireReferenceFileds(functionName: string, keys: Array<string>) {
        if (this.requireReferenceFileds == null) {
            this.requireReferenceFileds = new Map<string, Array<string>>();
        }
        this.requireReferenceFileds.set(functionName, keys)
    }
    //引用其他的Completion 
    public addReferenceCompletionKeys(functionName: string, keys: Array<string>) {
        if (this.referenceCompletionKeys == null) {
            this.referenceCompletionKeys = new Map<string, Array<string>>();
        }
        if (keys != null) {
            this.referenceCompletionKeys.set(functionName, keys)
        }
    }
    //当前的值为一个方法返回值
    public addReferenceCompletionFunKeys(functionName: string, keys: Array<string>) {
        if (this.referenceCompletionFunKeys == null) {
            this.referenceCompletionFunKeys = new Map<string, Array<string>>();
        }
        if (keys != null) {
            this.referenceCompletionFunKeys.set(functionName, keys)
        }
    }
    //如果completion 为一个function 那么就记录他的返回值 当前的值为一个方法返回值
    public addFunctionReturnCompletionKeys(functionName:string,keys: Array<string>) {
        if (this.functionReturnCompletionKeys == null) {
            this.functionReturnCompletionKeys = new Map<string, Array<string>>();
        }
        if (keys != null) {
            this.functionReturnCompletionKeys.set(functionName, keys)
        }
       
    }




}