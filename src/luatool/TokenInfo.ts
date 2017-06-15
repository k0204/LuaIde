
'use strict';
import { Range } from 'vscode-languageclient';
import { LuaParse } from './LuaParse';
import { CLog } from './Utils'
import { LuaFiledCompletionInfo } from "./provider/LuaFiledCompletionInfo";




/**
 * lua info
 */
export class LuaInfo {

    public moduleName: string;
    private comments: Array<LuaComment> = null;
    public type: LuaInfoType;
    public name: string;
    public aliasName: string = null;// 别名
    public parent: LuaInfo;
    public isPointFun:boolean = false

    /**是否是多变量 */
    public ismultipleVariables: boolean = false

    public localLuaInfo: Array<LuaInfo>;
    public params: Array<string>;
    public isValue: boolean = false;
    public value: LuaInfo;


    public multipleRoot: LuaInfo;
    /** : 的数量 */
    public punctuatorNumber_1: number = 0;
    /** . 的数量  */
    public punctuatorNumber_2: number = 0;
    /** [] 的数量 */
    public punctuatorNumber_3: number = 0;




    /**用于table 第一次判断 , */
    public tableIsFistItem: boolean = true;

    public bracket_Gs: Array<LuaInfo>;

    /**是否是包含在 [] 中的 */
    public isBracket_G: boolean = false



    //==============================华丽的分割线   新版本用到的=====================================
    /**后置的二元运算符号 用于预判值的计算 */
    public operatorToken: TokenInfo;

    /**一元数组 */
    public unarys: Array<TokenInfo>;
    /**是否是局部变量 */
    public isLocal = false;
    /** 所在文件 */
    public filePath: string;
    /**  . : 连接的下一个info */
    private nextLuaInfo: LuaInfo;
    private upLuaInfo: LuaInfo;
    /**lua对应的值 */
    public valueType: LuaInfoTypeValue;

    public isVar: boolean;

    public isAddToFiled: boolean = true
    public tableFileds: Array<LuaInfo>;
    public startToken: TokenInfo;
    public endToken: TokenInfo;

    public tableFiledType: number = 0;
    public isAnonymousFunction: boolean = false
    public isNextCheck: boolean = true;
    constructor(startToken: TokenInfo) {
        this.comments = new Array<LuaComment>();
        this.isVar = false
        this.startToken = startToken;
        this.type = LuaInfoType.Field;
        this.localLuaInfo = new Array<LuaInfo>();
        this.params = new Array<string>();
        this.unarys = new Array<TokenInfo>();
        this.tableFileds = new Array<LuaInfo>();
    }





    public getNextLuaInfo() {
        return this.nextLuaInfo;
    }
    public getUpInfo() {
        return this.upLuaInfo;
    }
    public setNextLuaInfo(nextLuaInfo: LuaInfo) {
        this.nextLuaInfo = nextLuaInfo;
        nextLuaInfo.ismultipleVariables = this.ismultipleVariables
        nextLuaInfo.isLocal = this.isLocal
        nextLuaInfo.isVar = this.isValue;
        nextLuaInfo.upLuaInfo = this;
        nextLuaInfo.comments = this.comments;
        this.comments = null

    }
    public getTopLuaInfo(): LuaInfo {
        while (true) {
            CLog();
            if (this.upLuaInfo) {
                return this.upLuaInfo.getTopLuaInfo();
            } else {
                return this
            }
        }

    }

    public getLastLuaInfo(): LuaInfo {
        while (true) {
            CLog();
            if (this.nextLuaInfo) {
                return this.nextLuaInfo.getLastLuaInfo();
            } else {
                return this
            }
        }
    }


    public setEndToken(token: TokenInfo) {
        this.endToken = token;
        if (this.type == LuaInfoType.Table) {
            return;
        }
        LuaParse.lp.luaInfoManager.addCompletionItem(this, token)
        
        //  LuaParse.lp.luaInfoManager.addFiledLuaInfo(this,token);

        // this.endToken = token;
        // var tokens:Array<TokenInfo> = LuaParse.lp.tokens;
        // var startIndex:number =this.startToken.range.start;
        // var endIndex:number = this.endToken.range.end;
        // var input = LuaParse.lp.lpt.input;
        // var name = input.substr(startIndex,endIndex-startIndex)
        // this.filePath = LuaParse.filePath;
        // this.moduleName = this.filePath.substring(0, this.filePath.lastIndexOf('.lua'))
        // var varName1 = "";
        // var varName2 = "";
        // if(this.startToken.index == this.endToken.index)
        // {
        //     if(this.startToken.type == TokenTypes.BooleanLiteral ||
        //     this.startToken.type == TokenTypes.NumericLiteral ||
        //     this.startToken.type == TokenTypes.VarargLiteral 
        //     ){
        //         return;
        //     }
        // }
        // // var currentFunctionLuaInfo:LuaInfo = LuaParse.lp.getCurrentFunctionLuaInfo();
        // var isLocal =false;
        // var isFunction = false;
        // var startIndex:number = this.startToken.index
        // for(var i = startIndex;i <= this.endToken.index;i++)
        // {
        //     //获取初始
        //     var token:TokenInfo =tokens[i];
        //     if(LuaParse.lp.consume('local',token,TokenTypes.Keyword))
        //     {
        //         isLocal = true
        //         continue;
        //     }
        //      if(LuaParse.lp.consume('function',token,TokenTypes.Keyword))
        //     {
        //         isFunction = true
        //         continue;
        //     }
        //     if(LuaParse.lp.consume('[',token,TokenTypes.Punctuator) && this.endToken.index >= i+2 )
        //     {

        //         var token1:TokenInfo = tokens[i+1]
        //         var token2:TokenInfo = tokens[i+2]

        //         if(token1.type == TokenTypes.StringLiteral && 
        //         LuaParse.lp.consume(']',token2,TokenTypes.Punctuator))
        //         {
        //             var x = parseInt(token1.value);

        //              if(isNaN(parseInt(token1.value)))
        //              {
        //                 varName1 += "[\""+ token1.value +"\"]"
        //                 varName2 += "."+token1.value;
        //                  i+=2;
        //                  continue;
        //              }else
        //              {

        //                   i+=2;
        //                  varName1 += "[\""+ token1.value +"\"]"
        //                 varName2 += "[\""+ token1.value +"\"]"
        //                 continue;
        //              }
        //         }

        //     }
        //     if(token.type == TokenTypes.StringLiteral)
        //      {
        //          var value = "\""+ token.value  + "\"";
        //           varName1 +=  value;
        //         varName2 +=  value
        //      }else
        //      {


        //         varName1 += token.value;
        //         varName2 += token.value;

        //      }

        // }
        //  console.log(varName1)





        //         this.name = varName1;
        //         if(varName1 == varName2) {
        // console.log("name1:" + varName1)

        //         }else
        //         {
        //         console.log("name1:" + varName1)
        //         console.log("name2:" + varName2)    
        //         }




    }

    /**
     * 添加参数名
     */
    public addParam(param): number {
        //需要检查是否有重复的参数名
        for (var i = 0; i < this.params.length; i++) {
            if (this.params[i] === param) {
                return i + 1;
            }

        }
        this.params.push(param);
        return -1;
    }
    public setComments(comments: Array<LuaComment>) {
        this.comments = this.comments.concat(comments)
    }
    public getComments(): Array<LuaComment> {
        return this.comments;
    }

}





export enum LuaInfoType {
    /** 字段 */
    Field = 1,
    /** Table */
    Table = 2,
    /** 方法 function xxx */
    Function = 3,

    /**模块方法function xx:xxx() end */
    moduleFunction = 5,
    /**参数 */
    Param = 6,
    /**匿名函数 */
    AnonymousFunction = 7,
    /** for 循环 number */
    FOR_I = 8,
    /** for 循环 pairs */
    FOR_PAIRS = 9,
    FunctionCall1,
    /**返回值 */
    RETURN = 11,
    WHILE = 12,
    ROOT = 13,
    IF = 14,
    ELSEIF = 15,
    ELSE = 16,

    Number,
    BOOLEAN,
    STRING,
    NIL,
    Vararg,
    Bracket_M





}

/**
 * 提示
 */
export class LuaComment {
    constructor(content, range: Range, isLong: boolean) {
        this.content = content;
        this.range = range;
        this.isLong = isLong;
    }
    //1 短注释
    //2 长注释
    public isLong: boolean = false;
    public content: string = null;
    public range: Range = null;

}
export class TokenInfo {

    public type: TokenTypes = TokenTypes.EOF;
    public value: any = '<eof>';
    public line: number = 0;
    public lineStart: number = 0;
    public nextToken:TokenInfo;
    public range: LuaRange = null;
    public error: LuaError = null;
    public index: number;
    public delimiter: string = null;
    public enddelimiter: string = null;
    public comments: Array<LuaComment>;
    public aftecomments: Array<LuaComment>;
    constructor() {
        this.comments = new Array<LuaComment>();
    }
    public addAfterComment(comment: LuaComment) {
        if (this.aftecomments == null) {
            this.aftecomments = new Array<LuaComment>();
        }
        this.aftecomments.push(comment);
    }
    public addComment(comment: LuaComment): void {
        this.comments.push(comment);
    }

}
export class LuaRange {
    public start: number;
    public end: number;
    constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
    }

}

export enum TokenTypes {
    EOF = 1,
    StringLiteral = 2,
    Keyword = 3,
    Identifier = 4,//标示符
    NumericLiteral = 5,
    Punctuator = 6,//标点符号
    BooleanLiteral = 7,
    NilLiteral = 8,
    VarargLiteral = 9,
    Wrap = 10,
    Tab = 11

}

export enum LuaErrorEnum {
    unexpected,
    expected,
    unfinishedString,//未完成的字符串
    malformedNumber,
    invalidVar,
    expectedToken,
    unoperator, //不合法的运算符 

}
export class LuaError {
    public type: LuaErrorEnum;
    public msg: string;

    public constructor(type: LuaErrorEnum, msg: string) {
        this.type = type;
        this.msg = msg;
    }
}
export enum LuaInfoTypeValue {
    NUMBER,
    BOOL,
    STRING,
    ANY,
    NIL,
    Table,
    Function
}