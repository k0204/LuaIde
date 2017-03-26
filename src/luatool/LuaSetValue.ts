import { LuaInfo, TokenInfo, LuaInfoTypeValue, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
export class LuaSetValue {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }
    //value 只能是  
    /**是否检查分号  */
    public check(isSemicolons:boolean,isComma:boolean,leftLuaInfos:Array<LuaInfo>,index:number=0):Array<LuaInfo> {
        var luaInfo:LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
        
        //检查是否为一元
        var luainfos: Array<LuaInfo> = new Array<LuaInfo>()
        while (true) {
            CLog();
            var nextLuaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
            luainfos.push(nextLuaInfo)
            this.lp.luaCheckUnary.check(nextLuaInfo);
            nextLuaInfo.startToken = this.lp.getCurrentToken(null);
            this.lp.luaChuckInfo.check(nextLuaInfo,isSemicolons)
            
            if (this.lp.isError) return null
            if(nextLuaInfo.type == LuaInfoType.Function)
            {
                if(nextLuaInfo.unarys.length == 0) {
                    nextLuaInfo.valueType = LuaInfoTypeValue.Function
                    if(leftLuaInfos != null && index <= leftLuaInfos.length-1)
                    {
                        var linfo:LuaInfo = leftLuaInfos[index];
                        linfo.params =nextLuaInfo.params;
                        linfo.type = LuaInfoType.Function;
                    }
               
              
                }else
                {
                    this.lp.setError(nextLuaInfo.unarys[0],"function 定义前有多余字符")

                }
            }
            
            if(nextLuaInfo.type == LuaInfoType.Table){
                nextLuaInfo.valueType = LuaInfoTypeValue.Table
                 if(leftLuaInfos != null && index <= leftLuaInfos.length-1)
                {
                    var linfo:LuaInfo = leftLuaInfos[index];
                    linfo.tableFileds =nextLuaInfo.tableFileds;
                    
                }
                //table 直接返回
               
               
           }
            var nextToken: TokenInfo = this.lp.getNextToken(null);
            if(nextToken == null)
            {
                this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
               if(nextLuaInfo.type != LuaInfoType.FunctionCall1
               ) 
               {
                    nextLuaInfo.setEndToken(this.lp.getUpToken())
               }
                   
            
                
                return luainfos
            }
            //验证是否为括号 ]
            //判断二元

            if (this.lp.luaValidateOperator.check(nextToken)) {
                
                nextLuaInfo.setEndToken(this.lp.getUpToken())
                this.lp.tokenIndex++;
                nextLuaInfo.operatorToken = nextToken
                continue
            }
            else if(this.lp.consume(',',nextToken,TokenTypes.Punctuator))
            {
                if(leftLuaInfos != null && index > leftLuaInfos.length -1)
                {
                    this.lp.setError(nextToken,"多余的变量赋值");
                    return
                }
                nextLuaInfo.setEndToken(this.lp.getUpToken())
                if(isComma){
                    this.lp.tokenIndex++;
                    this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
                    if(this.lp.isError)return
                    
                    this.check(isSemicolons,isComma,leftLuaInfos,++index);
                    
                    return luainfos
                }else
                {
                    this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
                    this.lp.tokenIndex--;
                    return luainfos
                }
            }
            else if( this.lp.consume(';',nextToken,TokenTypes.Punctuator))
            {
                 this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
              if(isSemicolons == false)
                {
                    this.lp.tokenIndex--;
                }
                return luainfos
            } 
            else {
                
                if(nextLuaInfo.type == LuaInfoType.Field &&  nextToken.type == TokenTypes.StringLiteral)
                {
                     var upToken:TokenInfo = this.lp.getUpToken();
                     nextLuaInfo.type = LuaInfoType.FunctionCall1
                    
                }else
                {
                    this.lp.tokenIndex--;   
                }
                  this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
                  if(nextLuaInfo.type != LuaInfoType.Bracket_M &&
                    nextLuaInfo.getLastLuaInfo().type != LuaInfoType.FunctionCall1
                  ){

                  
                  nextLuaInfo.setEndToken(this.lp.getCurrentToken(null))
                  }
                return luainfos
            }
        }

    }


}