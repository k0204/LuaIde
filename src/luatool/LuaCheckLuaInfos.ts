import {LuaInfo, LuaInfoTypeValue, TokenInfo, TokenTypes, LuaComment,
    LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
import {ExtensionManager} from "../luatool/ex/ExtensionManager"

/**验证 检查luainfo 集合 是否合法 */
export class LuaCheckLuaInfos {

    private lp: LuaParse;

    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    public check(
        luaInfos: Array<LuaInfo>, parentLuaInfo: LuaInfo) {
        if (!ExtensionManager.em.luaIdeConfigManager.luaOperatorCheck) {
            return
        }
        if (luaInfos.length == 1) {
            var luaInfo: LuaInfo = luaInfos[0]
            this.checkLuaInfoValue(luaInfo)



            if (this.lp.isError) return
            // if(luaInfo.valueType == LuaInfoTypeValue.STRING)
            // {
            //     parentLuaInfo.localLuaInfo.push(luaInfo)

            // }

            if (luaInfo.operatorToken != null) {
                this.lp.setError(luaInfo.operatorToken, "意外的字符")
                return
            }
            return
        }

        for (var i = 0; i < luaInfos.length; i++) {
            var luaInfo: LuaInfo = luaInfos[i]

            this.checkLuaInfoValue(luaInfo)
            if (this.lp.isError) return
            var token: TokenInfo = luaInfo.operatorToken
            if (token == null) {
                return
            }

            var value: string = token.value
            if (
                value == '+' ||
                value == '-' ||
                value == '*' ||
                value == '/' ||
                value == '^' ||
                value == '+' ||
                value == '%' ||
                value == '&' ||
                value == '<<' ||
                value == '>>' ||
                value == '|' ||
                value == '~'
            ) {
                if (luaInfo.valueType != LuaInfoTypeValue.NUMBER &&
                    luaInfo.valueType != LuaInfoTypeValue.ANY
                ) {

                    this.lp.setError(token, "非数字不能做运算")
                    return
                } else {

                    //判断下一个是否为 number || any
                    if (i + 1 < luaInfos.length) {
                        var nextLuaInfo: LuaInfo = luaInfos[i + 1]
                        this.checkLuaInfoValue(nextLuaInfo)
                        if (this.lp.isError) return

                        if (nextLuaInfo.valueType != LuaInfoTypeValue.NUMBER &&
                            nextLuaInfo.valueType != LuaInfoTypeValue.ANY) {
                            this.lp.setError(token, "非数字不能做运算")
                            return
                        }
                    }
                }
            }
            else if (
                value == '>' ||
                value == '<' ||
                value == '>=' ||
                value == '<='
            ) {
                if (luaInfo.valueType != LuaInfoTypeValue.NUMBER &&
                    luaInfo.valueType != LuaInfoTypeValue.STRING &&
                    luaInfo.valueType != LuaInfoTypeValue.ANY
                ) {

                    this.lp.setError(token, "非数字不能做运算")
                    return
                } else {

                    //判断下一个是否为 number || any
                    if (i + 1 < luaInfos.length) {
                        var nextLuaInfo: LuaInfo = luaInfos[i + 1]
                        this.checkLuaInfoValue(nextLuaInfo)
                        if (this.lp.isError) return
                        if (nextLuaInfo.valueType != LuaInfoTypeValue.NUMBER &&
                            nextLuaInfo.valueType != LuaInfoTypeValue.ANY &&
                            nextLuaInfo.valueType != LuaInfoTypeValue.STRING) {

                            this.lp.setError(token, "非数字不能做运算")
                            return
                        }
                    }
                }
            }

            else if (value == '..') {
                if (luaInfo.valueType == LuaInfoTypeValue.BOOL) {
                    this.lp.setError(token, "boolean 不能 用于字符串连接")
                    return
                } else {

                    if (i + 1 < luaInfos.length) {
                        var nextLuaInfo: LuaInfo = luaInfos[i + 1]
                        if (nextLuaInfo.valueType == LuaInfoTypeValue.BOOL) {
                            this.lp.setError(token, "boolean 不能 用于字符串连接")
                            return
                        }
                    }
                }
            }
            else if (
                value == '==' ||
                value == '~=') {
                //正确的 不需要处理

            }
            else if (
                value == 'and' ||
                value == 'or'
            ) {
                //正确的 不需要处理
            }
        }
    }
    public checkLuaInfoValue(luaInfo: LuaInfo) {

        var valueType: LuaInfoTypeValue = null
        var unarys: Array<TokenInfo> = luaInfo.unarys;
        if (unarys.length == 0) {
            // luaInfo.valueType = LuaInfoTypeValue.ANY
            return
        }
        var length: number = unarys.length - 1
        while (length >= 0) {
            CLog();
            var token: TokenInfo = unarys[length]
            if (valueType == null) {
                if (this.lp.consume('#', token, TokenTypes.Punctuator)) {
                    if (luaInfo.type == LuaInfoType.FunctionCall1 ||
                        luaInfo.type == LuaInfoType.Field ||
                        luaInfo.type == LuaInfoType.Vararg ||
                        luaInfo.type == LuaInfoType.Bracket_M

                    ) {
                        valueType = LuaInfoTypeValue.NUMBER
                    } else {
                        this.lp.setError(token, "不能计算长度")
                        return
                    }
                }
                else if (this.lp.consume('-', token, TokenTypes.Punctuator)) {
                    if (luaInfo.type == LuaInfoType.FunctionCall1 ||
                        luaInfo.type == LuaInfoType.Field ||
                        luaInfo.type == LuaInfoType.Number ||
                        luaInfo.type == LuaInfoType.Vararg ||
                        luaInfo.type == LuaInfoType.Bracket_M
                    ) {
                        valueType = LuaInfoTypeValue.NUMBER
                    } else {
                        this.lp.setError(token, "不能计算长度")
                        return
                    }
                }
                else if (this.lp.consume('not', token, TokenTypes.Keyword)) {
                    if (luaInfo.type == LuaInfoType.FunctionCall1 ||
                        luaInfo.type == LuaInfoType.Field ||
                        luaInfo.type == LuaInfoType.BOOLEAN ||
                        luaInfo.type == LuaInfoType.STRING ||
                        luaInfo.type == LuaInfoType.NIL ||
                        luaInfo.type == LuaInfoType.Vararg ||
                        luaInfo.type == LuaInfoType.Number ||
                        luaInfo.type == LuaInfoType.Bracket_M
                    ) {
                        valueType = LuaInfoTypeValue.BOOL
                    } else {
                        this.lp.setError(token, "不能转换为 boolean")
                        return
                    }
                }
            } else {
                if (this.lp.consume('#', token, TokenTypes.Punctuator)) {
                    this.lp.setError(token, "不能计算长度")
                    return
                }
                else if (this.lp.consume('-', token, TokenTypes.Punctuator)) {
                    if (valueType == LuaInfoTypeValue.NUMBER ||
                        luaInfo.type == LuaInfoType.Bracket_M) {

                    }
                    else {

                        this.lp.setError(token, "非数字不能为 负数")
                        return
                    }
                }
                else if (this.lp.consume('not', token, TokenTypes.Keyword)) {
                    valueType = LuaInfoTypeValue.BOOL
                }
            }

            length--;

            // if (this.lp.consume('#', token, TokenTypes.Punctuator)) {
            //     if (valueType == null) {
            //         if (luaInfo.type == LuaInfoType.FunctionCall ||
            //             luaInfo.type == LuaInfoType.Field) {
            //             valueType = LuaInfoTypeValue.NUMBER
            //         } else {
            //             this.lp.setError(token, "不能计算长度")
            //             return
            //         }
            //     } else if (valueType == LuaInfoTypeValue.ANY) {
            //         valueType = LuaInfoTypeValue.NUMBER
            //     } else {
            //         this.lp.setError(token, "不能计算长度")
            //         return
            //     }

            // }
            // else if (this.lp.consume('-', token, TokenTypes.Punctuator)) {

            // }
        }
        luaInfo.valueType = valueType
    }

}



