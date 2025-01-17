
const testTester = () => {

  const unit = Exports.newUnit({
    showErrorsOnly: true,
  })

  const fix = {
    ob: { a: 1, b: 2 },
    nob: { a: 1, b: 2, c: 3 }
  }

  const u = Exports.Utils

  unit.section(async (t) => {

    unit.is('foo', 'foo')
    unit.not('foo', 'bar')
    t.is('foo', 'foo')
    t.not('foo', 'bar')
    const ob2 = fix.ob

    unit.is(fix.ob, ob2, { description: "unit does deepequal" })
    unit.is(fix.ob, { ...ob2 })
    t.is(fix.ob, fix.ob, { description: "t does js compare" })
    t.not(fix.ob, { ...ob2 })

    t.deepEqual([fix.ob], [{ ...ob2 }], 'deep equal tests same for both')
    t.notDeepEqual(fix.ob, fix.nob)
    unit.deepEqual([fix.ob], [{ ...ob2 }])
    unit.notDeepEqual(fix.ob, fix.nob)

  }, {
    description: 'some basics'
  })

  unit.section('try description as argument', t => {
    t.truthy(1)
    t.falsey(0)
  })

  unit.section('try description as argument', t => {
    unit.truthy('foo', { description: 'this is a test' })
    t.is('foo', 'foo', 'trying description ava style')
  }, {
    description: 'override text by description property',
    showErrorsOnly: false,
  })

  unit.section('wildcard stuff', t => {
    t.hasWildCards("f*")
    unit.notHasWildCards("foo")
    unit.hasWildCards("f?")
    unit.hasWildCards("f**")

    t.wildCardMatch("foo", "f*", { description: "for ava order tests wildcard is the expected" })
    unit.wildCardMatch("f*", "foo", { description: "for original order tests wildcard is the expected" })

    t.wildCardMatch ("foo","f*o")
    t.wildCardMatch ("foo","f?o")

    t.wildCardMatch ("/a/b/x.pdf", "**/*.pdf")
    t.notWildCardMatch ("/a/b/x.pdf", "*/*.pdf")
  })

  unit.section('rx stuff', t => {
    t.rxMatch("foo", /^F/i,  "for ava order rx is the expected" )
    unit.rxMatch(/.*O$/i, "foo",  "for original order rx wildcard is the actual" )
  })

  unit.report()
}