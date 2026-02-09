import { Expr, ConstExpr, RefExpr, DynExpr, CompoundExpr } from '../model/Expr';
import utility from './utility';


/**
 * copy Expr object
 *
 * @param {Expr} expr
 * @returns {Expr}
 */
function copyExpr (expr) {
    if (expr instanceof ConstExpr) {
        return new ConstExpr(expr.value());
    } else if (expr instanceof RefExpr) {
        return new RefExpr(expr);
    } else if (expr instanceof DynExpr) {
        return new DynExpr(expr.$getter, expr.value());
    } else if (expr instanceof CompoundExpr) {
        return new CompoundExpr(expr.$evaluator, expr.$args.map(copyExpr), expr.value());
    } else {
        throw new TypeError("unsupported expr type");
    }
}

/**
 * create Expr from value, if value itself is an Expr, it will be copied
 *
 * @param {any} value
 * @returns {Expr}
 */
export function value2Expr (value) {
    if (value instanceof Expr) {
        return copyExpr(value);
    } else if (utility.isFunc(value)) {
        return new DynExpr(value);
    } else {
        return new ConstExpr(value);
    }
}