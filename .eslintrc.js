module.exports = {
  root: true,
  env: {
    node: true,
  },
  extends: ['airbnb-base', 'plugin:node/recommended', 'prettier'], // prettier는 항상 뒤에
  parserOptions: {
    ecmaVersion: 2020,
  },
}
