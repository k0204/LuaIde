
/**
 * lua 文件解析
 * 该文件解析  和现在网上的代码有所不同 
 * 更加自身情况而的代码格式解析  
 * 在前3天我研究了 c# 的 lua 解析 以及 js  的  他们都写得很好
 * 但是不太满足我的需求 所以我决定自己写一套 来实现代码提示
 */

import {Range} from 'vscode-languageclient';
import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParseTool} from './LuaParseTool'
import {LuaTableParse} from './LuaTableParse'
import {LuaFunctionParse} from './LuaFunctionParse'
import {LuaIfLogic} from './LuaIfLogic'
import {LuaInfoManager} from './LuaInfoManager'
import {LuaWhileLogic} from './LuaWhileLogic'
import {LuaForLogic} from './LuaForLogic'
import {CLog} from './Utils'
import {FunctionCall} from './FunctionCall'


import {LuaCheckReturn} from './LuaCheckReturn'
import {LuaLeftCheck} from './LuaLeftCheck'
import {LuaCheckUnary} from './LuaCheckUnary'
import {LuaValidateBracket_G} from './LuaValidateBracket_G'
import {LuaChuckInfo} from './LuaChuckInfo'
import {LuaValidateConstValue} from './LuaValidateConstValue'
import {LuaValidateOperator} from './LuaValidateOperator'
import {LuaCheckLuaInfos} from './LuaCheckLuaInfos'
import {LuaSetValue} from './LuaSetValue'
import {LuaValidateBracket_M} from './LuaValidateBracket_M'
import {LuaFuncitonCheck} from './LuaFuncitonCheck'
import {LuaCheckRepeat} from './LuaCheckRepeat'
import {LuaCheckDoEnd} from './LuaCheckDoEnd'

import vscode = require('vscode');



export class LuaParse {
  public static lp:LuaParse;
  public lpt: LuaParseTool;
  public luaTableParse: LuaTableParse;
  public tokenIndex: number = 0;
  public luaFunctionParse: LuaFunctionParse;
  public luaIfLogic: LuaIfLogic;
  public tokensLength: number = 0;
  
  //解析过程中是否有错
  public isError: boolean = false;
  public errorMsg:Array<string> = new Array<string>();
  public tokens: Array<TokenInfo>;
  public rootLuaInfo: LuaInfo;
  public luaInfoManager: LuaInfoManager;
  public luaWhileLogic: LuaWhileLogic;
  public luaForLogic: LuaForLogic;
  public functionCall: FunctionCall;
  public luaCheckReturn: LuaCheckReturn;
  public luaLeftCheck: LuaLeftCheck;
  public luaCheckUnary: LuaCheckUnary;
  public luaValidateBracket_G: LuaValidateBracket_G;
  public luaChuckInfo: LuaChuckInfo;
  public luaValidateConstValue: LuaValidateConstValue;
  public luaValidateOperator: LuaValidateOperator;
  public luaCheckLuaInfos: LuaCheckLuaInfos;
  public luaSetValue: LuaSetValue;
  public luaValidateBracket_M: LuaValidateBracket_M;
  public luaFuncitonCheck: LuaFuncitonCheck;
  public static filePath:string;
  public diagnosticCollection: vscode.DiagnosticCollection;
  public luaCheckRepeat:LuaCheckRepeat;
  public luaCheckDoEnd:LuaCheckDoEnd;
  public currentUri:vscode.Uri;
  public errorFilePaths:Array<vscode.Uri>;
  public isCheckAllError:Boolean;
  //判断变量是不是全局的
  public currentfunctionCount:number = 0;
  public currentFunctionNames:Array<string>;
  constructor(diagnosticCollection:vscode.DiagnosticCollection) {
    LuaParse.lp = this;
    this.errorFilePaths = new Array<vscode.Uri>();
    this.luaInfoManager = new LuaInfoManager();
    this.diagnosticCollection = diagnosticCollection;
    this.lpt = new LuaParseTool(this);
    this.luaTableParse = new LuaTableParse(this);
    this.luaFunctionParse = new LuaFunctionParse(this)
    this.luaIfLogic = new LuaIfLogic(this)
    this.luaWhileLogic = new LuaWhileLogic(this);
    this.luaForLogic = new LuaForLogic(this)
    this.luaCheckRepeat = new LuaCheckRepeat(this)
    this.functionCall = new FunctionCall(this)

    this.luaCheckReturn = new LuaCheckReturn(this)
    this.luaLeftCheck = new LuaLeftCheck(this)
    this.luaCheckUnary = new LuaCheckUnary(this)
    this.luaValidateBracket_G = new LuaValidateBracket_G(this)
    this.luaChuckInfo = new LuaChuckInfo(this)
    this.luaValidateConstValue = new LuaValidateConstValue(this)
    this.luaValidateOperator = new LuaValidateOperator(this)
    this.luaCheckLuaInfos = new LuaCheckLuaInfos(this)
    this.luaSetValue = new LuaSetValue(this)
    this.luaValidateBracket_M = new LuaValidateBracket_M(this)
    this.luaFuncitonCheck = new LuaFuncitonCheck(this);
    this.luaCheckDoEnd = new LuaCheckDoEnd(this)
  }

  //传入的需要解析的代码
  public Parse(uri:vscode.Uri, text:string,isCheckAllError:boolean= false): any {
    this.currentfunctionCount =0 
    this.currentFunctionNames = new Array<string>();
    this.isCheckAllError = isCheckAllError;
    this.currentUri = uri;
    this.rootLuaInfo = new LuaInfo(null);
    this.rootLuaInfo.type = LuaInfoType.ROOT
    LuaParse.filePath = uri.path;
    this.lpt.Reset(text);
    this.isError = false;
   
    //解析分为全局变量 和局部变量 在这里    
    this.end();

  }

  private end(): void {
    var data:Date = new Date();
    //先
    var tokens = new Array<TokenInfo>();
    while (true) {
      CLog();
      var token: TokenInfo = this.lpt.lex();
      if (token.error != null) {
        this.setError(token, token.error.msg)
        return;
      }
      if (token.type == TokenTypes.EOF) {
        break;
      }
      token.index = tokens.length;
      tokens.push(token);
    }
    var date1:Date = new Date();
    var time:number = date1.getMilliseconds() - data.getMilliseconds()
    this.tokens = tokens;
    this.luaInfoManager.init(this, this.currentUri);
    this.tokenIndex = 0;
    this.tokensLength = tokens.length;
   var isReturn = this.setLuaInfo(this.rootLuaInfo,null,null)
   if(isReturn)
   {
      if (this.tokenIndex < this.tokensLength) {
        this.setError(this.getLastToken(),"return 的多余字符")
      }
   }
    if (this.isError == false) {
      for(var i = 0; i < this.errorFilePaths.length;i++)
      {
        if(this.currentUri.path == this.errorFilePaths[i].path)
        {
            this.errorFilePaths.splice(i,1)
            break;
        }
      }
      // console.log("正确了")
      //正确了删除错误提示
      this.diagnosticCollection.delete(this.currentUri)
      this.luaInfoManager.getFcim(this.currentUri).selfToGolbal();
    } else {
      // var isAdd:boolean = true
      // this.errorFilePaths.forEach(uri=>{
      //   if(this.currentUri.path == uri.path)
      //   {
      //     isAdd = false;
      //   }
      // })
      // if(isAdd)
      // {
      //   this.errorFilePaths.push(this.currentUri);
      // }
       this.luaInfoManager.getFcim(this.currentUri).selfToGolbal();
      console.log("错误的")
    }

  }











  /**
   * 返回值为 是否是 checkEnd 的返回值
   */
  public setLuaInfo(parent: LuaInfo,checkEnd:Function,checkBreak:Function):any {
    while (true) {
      CLog();
       var returnValue = false
      if (this.tokenIndex < this.tokensLength) {

        if(checkBreak)
         {
           checkBreak(this)
           if(this.isError)return false

         }else
         {
            var breaktoken: TokenInfo = this.getTokenByIndex(this.tokenIndex, null)
            if (this.consume("break", breaktoken, TokenTypes.Keyword)) {
              
                this.checkSemicolons()
                this.tokenIndex++;
            } 
         }
        
        //检查function
       returnValue = this.luaCheckReturn.check(parent,checkEnd,false)
        if (returnValue != false) {
          return returnValue
        }
        if(this.isError)return false
        if(checkEnd !=null)
          {
           returnValue = checkEnd(this);
            if(this.isError)return
            if(returnValue != false) return returnValue;
            
          }
          if(this.luaFuncitonCheck.check())
         {
            if(this.isError)return false
          
           continue;
         }
          if(this.isError)return
           if(this.tokenIndex >= this.tokens.length)
         {
           return true
         }
         if( this.luaForLogic.check())
         {
            continue;
         }
          if(this.isError)return false
          //检查 Repeat
        if(this.luaCheckRepeat.check())
        {
           if(this.isError)return false
           continue;
        }
        //检查if
         if(this.luaIfLogic.check(parent,true,false,false,checkBreak))
         {
            if(this.isError)return false
         
           continue;
         }
         if(this.isError)return false
         if(this.luaCheckDoEnd.check()){
           if(this.isError)return false
           continue;
         }
         
         if(this.isError)return false
        
         if(this.tokenIndex >= this.tokens.length)
         {
           return true
         }
        //检查while
         if(this.luaWhileLogic.check(parent))
         {
            if(this.isError)return false
           continue;
         }
         if(this.isError)return false
        this.luaLeftCheck.check(parent)
        if(this.isError)return
        this.tokenIndex++;
        //检查是否未 字符
        if (this.isError) {
          return false
        } else {
          if(checkEnd !=null)
          {
           returnValue = checkEnd(this);

            if(this.isError)return
            if(returnValue != false)
            {
              return returnValue;
            }else
            {
               
               continue;
            }
          }else
          {
           
            continue;
          }
          
        }

      } else {
        return false
      }
    }
  }
  /**检查分号 */
  public checkSemicolons() {
    var token: TokenInfo = this.getNextToken(null)
    if (token != null && this.consume(';', token, TokenTypes.Punctuator)) {
      return true
    }
    this.tokenIndex--;
    return false
  }


  public setError(token: TokenInfo, typeMsg: string,startToen:TokenInfo=null): void {
    this.isError = true;
    if(startToen == null)
    {
      startToen = token;
    }
    var starPo:vscode.Position = new vscode.Position(startToen.line,startToen.range.start - startToen.lineStart)
    var endPo:vscode.Position = new vscode.Position(token.line,token.range.end - token.lineStart)
    var range:vscode.Range = new vscode.Range(starPo,endPo)
   var currentDiagnostic:vscode.Diagnostic = new vscode.Diagnostic(range, typeMsg,        vscode.DiagnosticSeverity.Error);
    this.diagnosticCollection.set(this.currentUri, [currentDiagnostic]);
 
  }
  public getUpToken():TokenInfo
  {
    return this.tokens[this.tokenIndex-1];
  }
  public getLastToken():TokenInfo
  {
    return this.tokens[this.tokens.length-1]
  }
  public getTokenByIndex(tokenIndex: number, errorMsg: string): TokenInfo {
    // console.log(tokenIndex)
    if (tokenIndex < this.tokensLength) {
      return this.tokens[tokenIndex]
    }
    if (errorMsg != null) {
      var upToken = null
      while (true) {
        CLog();
        tokenIndex -= 1
        upToken = this.tokens[tokenIndex]
        if (upToken != null) {
          break;
        }
      }
      this.setError(upToken, errorMsg);
    }
    return null
  }
  /**
   * 获得下一个token
   */
  public getNextToken(errorMsg: string): TokenInfo {
    this.tokenIndex++;
    return this.getCurrentToken(errorMsg)
  }
  /**
   * 获得当前token
   */
  public getCurrentToken(errorMsg: string): TokenInfo {
   
    if (this.tokenIndex < this.tokensLength) {
      //  console.log(this.tokens[this.tokenIndex].line +" : "+ this.tokens[this.tokenIndex].value + " :"+this.tokenIndex)
      return this.tokens[this.tokenIndex]
    }
    if (errorMsg != null) {
      var tokenIndex = this.tokenIndex;
      var upToken: TokenInfo = null;
      while (true) {
        CLog();
        tokenIndex -= 1
        upToken = this.tokens[tokenIndex]
        if (upToken != null) {
          break;
        }
      }
      this.setError(upToken, errorMsg);
    }
    return null
  }
  
  public getCurrentFunctionLuaInfo()
  {
    // if(this.functionList.length > 0)
    // {
    //   return this.functionList[this.functionList.length-1]
    // }else
    // return null
  }

  public functionStart(luaInfo:LuaInfo)
  {
    // var luaCompletionItem:LuaCompletionItem = new LuaCompletionItem(luaInfo,this.tokens);
    // this.functionList.push(luaCompletionItem);
  }
  public functionEnd()
  {
      // this.functionList.pop();
  }
  






  /**
   * 进行对比传入的 指 如果 相同返回true 并指向下一个 token
   */
  public consume(value: string, token: TokenInfo, tokenTypes: TokenTypes): boolean {

    if (value === token.value && token.type == tokenTypes) {
      // this.next();
      return true;
    }
    return false;
  }











}