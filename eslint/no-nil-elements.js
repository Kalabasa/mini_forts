const { ESLintUtils } = require('@typescript-eslint/utils');
const tsutils = require('ts-api-utils');
const ts = require('typescript');

export const noNilElementsRule = ESLintUtils.RuleCreator.withoutDocs({
  create(context) {
    return {
      TSArrayType(node) {
        const services = ESLintUtils.getParserServices(context);
        const elementType = services.getTypeAtLocation(node.elementType);
        if (couldBeNullish(elementType)) {
          context.report({
            messageId: 'dont',
            node: node.elementType,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        'Ban undefined or null elements in arrays for Lua compatibility.',
    },
    messages: {
      dont: 'Do not use undefined or null elements in arrays.',
    },
    type: 'suggestion',
    schema: [],
  },
  defaultOptions: [],
});

function couldBeNullish(type) {
  if (type.flags & ts.TypeFlags.TypeParameter) {
    const constraint = type.getConstraint();
    return constraint == null || couldBeNullish(constraint);
  } else if (tsutils.isUnionType(type)) {
    for (const part of type.types) {
      if (couldBeNullish(part)) {
        return true;
      }
    }
    return false;
  }
  return (type.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) !== 0;
}
