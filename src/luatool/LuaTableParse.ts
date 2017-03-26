import {LuaInfo,  TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'

export class LuaTableParse {
  private lp: LuaParse;

  constructor(luaparse: LuaParse) {
    this.lp = luaparse;
  }


  public check(luaInfo:LuaInfo)
  {
    
   luaInfo.type = LuaInfoType.Table;
  
    while(true)
    {
        CLog();
        var token:TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 1,"table 未完成");
        if(this.lp.consume('}',token,TokenTypes.Punctuator))
        {
            this.lp.tokenIndex++;
            return
        }
        if(this.lp.isError)return
        if(token.type == TokenTypes.Identifier)
        {
          
            var nextToken:TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 2,"table 未完成");
            if(this.lp.isError)return
            if(this.lp.consume('=',nextToken,TokenTypes.Punctuator))
            {
                var fluaInfo:LuaInfo = new LuaInfo(nextToken);
                fluaInfo.name = token.value;
               fluaInfo.endToken = nextToken;
                var leftLuaInfos:Array<LuaInfo> = new Array<LuaInfo>();
                leftLuaInfos.push(fluaInfo)
                this.lp.tokenIndex+= 3;
                luaInfo.tableFileds.push(fluaInfo);
                this.lp.luaSetValue.check(false,false,leftLuaInfos);
                
            }else
            {
                this.lp.tokenIndex++;
                this.lp.luaSetValue.check(false,false,null);

            }
        }
        else if(this.lp.consume('[',token,TokenTypes.Punctuator))
        {
            this.lp.tokenIndex += 2;
            var startIndex:number = this.lp.tokenIndex;
            var newLuaInfo:LuaInfo = new LuaInfo(token)
            this.lp.luaValidateBracket_G.check(newLuaInfo,false)
            var endIndex:number =this.lp.tokenIndex;
            var nextToken:TokenInfo = this.lp.getNextToken("代码未完成")
            if(this.lp.isError)return
            if(this.lp.consume('=',nextToken,TokenTypes.Punctuator))
            {
              
                if(endIndex - startIndex == 1) 
                {
                    var token:TokenInfo = this.lp.tokens[startIndex];
                    newLuaInfo.name = "["+ token.value +"]"
                    newLuaInfo.tableFiledType =1;
                    luaInfo.tableFileds.push(newLuaInfo);
                   
                }
                var leftLuaInfos:Array<LuaInfo> = new Array<LuaInfo>();
                leftLuaInfos.push(newLuaInfo)
                this.lp.tokenIndex+= 1;
                this.lp.luaSetValue.check(false,false,leftLuaInfos);
               
            }else
            {
                this.lp.setError(nextToken,"缺少 '='")
                return

            }

        }
        else
        {
           this.lp.tokenIndex++;
          this.lp.luaSetValue.check(false,false,null)
        }
         token = this.lp.getTokenByIndex(this.lp.tokenIndex + 1,"table 未完成");
       if(this.lp.consume(',',token,TokenTypes.Punctuator) || this.lp.consume(';',token,TokenTypes.Punctuator))
        {
            this.lp.tokenIndex++;
             var endToken:TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 1,"table 未完成");
             if(this.lp.consume('}',endToken,TokenTypes.Punctuator))
             {
                //  luaInfo.endToken = endToken;
                this.lp.tokenIndex++;
               return
             }else
             {
               continue;
             }
        }else if(this.lp.consume('}',token,TokenTypes.Punctuator))
        {
            //  luaInfo.endToken = token;
            this.lp.tokenIndex++;
            return
        }else
        {
          this.lp.setError(token,"table 定义出现意外字符")
          return
        }
            
    }
  }
}