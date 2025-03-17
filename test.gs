//import { Exports } from './index.mjs';


const testTester = async () => {


  if (Exports.CodeLocator.isGas) {
    // because a GAS library cant get its caller's code
    Exports.CodeLocator.setGetResource(ScriptApp.getResource)
    // optional - generally not needed - only necessary if you are using multiple libraries and some file sahre the same ID
    Exports.CodeLocator.setScriptId(ScriptApp.getScriptId())
  }

  const unit = Exports.newUnit({
    showErrorsOnly: true,
    showValues: true
  })

  const fix = {
    ob: { a: 1, b: 2 },
    nob: { a: 1, b: 2, c: 3 }
  }

  const u = Exports.Utils

  unit.section(t => {

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
    description: 'some basics',
    skip: false
  })

  unit.cancel ()
  unit.section ('this section should be cancelled', t=> {
    t.is ('foo','bar')
  })

  unit.unCancel () 
  unit.section ('uncancelled again', t=> {
    const {eql} = t.is ('foo','bar')
    if (!eql) {
      t.cancel ()
    }
    t.is ('foo','bar','this one should be skipped')
  })
  
  unit.section('try description as argument', t => {
    t.truthy(1)
    t.falsey(0)
  }, {
    skip: false
  })

  unit.section('code formatting with brief', t => {
    t.is('foo', 'bar', 'deliberate fail')
    t.is('foo', 'bar', {
      description: 'deliberate fail non brief override',
      codeLocationFormatOptions: {
        brief: false
      }
    })
  }, {
    codeLocationFormatOptions: {
      brief: true,
    }
  })

  unit.section('try description as argument', t => {
    unit.truthy('foo', { description: 'this is a test' })
    t.is('foo', 'foo', 'trying description ava style')
  }, {
    description: 'override text by description property',
    showErrorsOnly: false,
  }, {
    skip: false
  })

  unit.section('wildcard stuff', t => {
    t.hasWildCards("f*")
    unit.notHasWildCards("foo")
    unit.hasWildCards("f?")
    unit.hasWildCards("f**")

    t.wildCardMatch("foo", "f*", { description: "for ava order tests wildcard is the expected" })
    unit.wildCardMatch("f*", "foo", { description: "for original order tests wildcard is the expected" })

    t.wildCardMatch("foo", "f*o")
    t.wildCardMatch("foo", "f?o")

    t.wildCardMatch("/a/b/x.pdf", "**/*.pdf")
    t.notWildCardMatch("/a/b/x.pdf", "*/*.pdf")
  }, {
    skip: false
  })

  unit.section('rx stuff', t => {
    t.rxMatch("foo", /^F/i, "for ava order rx is the expected")
    unit.rxMatch(/.*O$/i, "foo", "for original order rx wildcard is the actual")
    const f = t.threw(()=>t.rxMatch(/bar/, "foo"))
    t.rxMatch (f,/expect argument should be/,"becuse a forced fail above")
  })

  await ('await async stuff on apps script', async t=> {
    t.is ('foo','bar')
  })

  unit.report()

  console.log ('....should be 3 deliberate fails in this overall test')
}

//(async () => { await testTester() })(); //NO-GAS