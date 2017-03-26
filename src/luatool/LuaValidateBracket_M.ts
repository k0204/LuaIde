import {LuaInfo, TokenInfo, LuaInfoTypeValue, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
/**验证 ( */
export class LuaValidateBracket_M {
    private lp: LuaParse;
  
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**验证 小括号( */
  public check(luaInfo: LuaInfo): boolean {
    //缓存 一元运算符号
    // var unary: string = luaInfo.unary

    // luaInfo.unary = ""
    var exToken = this.lp.getCurrentToken( "代码未完成");
    if (exToken == null) return false;
    if (this.lp.consume(')', exToken, TokenTypes.Punctuator)) {
      this.lp.setError(exToken, "() 中间不能为空!  ");

      return false
    }
     var luainfos:Array<LuaInfo> = new Array<LuaInfo>()
    while (true) {
      CLog();
      var nextLuaInfo: LuaInfo =  new LuaInfo(this.lp.getCurrentToken(null))
      luainfos.push(nextLuaInfo)
      this.lp.luaCheckUnary.check(nextLuaInfo);
      this.lp.luaChuckInfo.check(nextLuaInfo,false)
      
      if (this.lp.isError) return null
      var nextToken:TokenInfo = this.lp.getNextToken("代码未完成");
      if(this.lp.isError)return
      //验证是否为括号 ]
      //判断二元
      if (this.lp.consume(')', nextToken, TokenTypes.Punctuator)) {
          //这里检查表达式的合法性

          this.lp.luaCheckLuaInfos.check(luainfos,luaInfo)
          nextLuaInfo.type = LuaInfoType.Field;
          nextLuaInfo.setEndToken(this.lp.getCurrentToken(null))
          luaInfo.valueType = LuaInfoTypeValue.ANY;
          luaInfo.type = LuaInfoType.Bracket_M

        nextToken = this.lp.getTokenByIndex(this.lp.tokenIndex + 1, null);
        if (nextToken) {
           if (this.lp.consume('.', nextToken, TokenTypes.Punctuator)) {
            this.lp.tokenIndex++;
            var newLuaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
            nextToken = this.lp.getNextToken("代码未完成")
            if (this.lp.isError) return;
            if (nextToken.type != TokenTypes.Identifier) {
              this.lp.setError(nextToken, "意外的字符")
              return;

            } else {

            }
            
            luaInfo.setNextLuaInfo(newLuaInfo);
            this.lp.luaChuckInfo.check(newLuaInfo, true)

            if (this.lp.isError) return
            return;
          } else if (this.lp.consume('[', nextToken, TokenTypes.Punctuator)) {
            this.lp.tokenIndex += 2;
            this.lp.luaValidateBracket_G.check(luaInfo, true)
            break;
          }
          else if (this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {

            this.lp.tokenIndex++;
            this.lp.functionCall.check(luaInfo, true, false);
            break;
          }
          else if (this.lp.consume(':', nextToken, TokenTypes.Punctuator)) {
            this.lp.tokenIndex += 2;
            if (luainfos.length == 1) {
              this.lp.luaChuckInfo.checkModuleFunctionCall(luaInfo, true)
            } else {
              this.lp.luaChuckInfo.checkModuleFunctionCall(luaInfo, true)
            }
            luaInfo.type = LuaInfoType.FunctionCall1;
            return;
          } else if (this.lp.consume('=', nextToken, TokenTypes.Punctuator)) {
            return
          } else return
        }
      } 
      if( this.lp.luaValidateOperator.check(nextToken))
      {
        nextLuaInfo.setEndToken(this.lp.getUpToken())
        this.lp.tokenIndex++;
        nextLuaInfo.operatorToken = nextToken

        continue
      }else
      {
        this.lp.setError(nextToken, "错误的字符")
        return
      }
    }
  }

}