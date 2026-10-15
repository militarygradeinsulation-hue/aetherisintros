import { describe, expect, it } from 'vitest'

import { DEFAULT_QUICK_ITEMS, MAX_QUICK_ITEMS, QUICK_ACTIONS, cleanItems, moveItem, placeMenu, toggleItem } from '../quick-menu'

describe('quick menu', () => {
  it('keeps only known items, once each, up to the limit', () => {
    expect(cleanItems(['people', 'nope', 'people', 'intros'])).toEqual(['people', 'intros'])
    expect(cleanItems(null)).toEqual(DEFAULT_QUICK_ITEMS)
    expect(cleanItems('people')).toEqual(DEFAULT_QUICK_ITEMS)
    expect(cleanItems([])).toEqual([])
    expect(cleanItems(QUICK_ACTIONS.map(a => a.id))).toHaveLength(MAX_QUICK_ITEMS)
  })

  it('has a valid default and slug-shaped ids the database accepts', () => {
    expect(cleanItems(DEFAULT_QUICK_ITEMS)).toEqual(DEFAULT_QUICK_ITEMS)
    for (const a of QUICK_ACTIONS) expect(a.id).toMatch(/^[a-z][a-z0-9-]{1,31}$/)
  })

  it('reorders and toggles items', () => {
    expect(moveItem(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c'])
    expect(toggleItem(['people'], 'people')).toEqual([])
    expect(toggleItem(['people'], 'intros')).toEqual(['people', 'intros'])
    expect(toggleItem(['people'], 'unknown')).toEqual(['people'])
    const full = QUICK_ACTIONS.slice(0, MAX_QUICK_ITEMS).map(a => a.id)
    expect(toggleItem(full, QUICK_ACTIONS[MAX_QUICK_ITEMS]!.id)).toEqual(full)
  })

  it('keeps the menu on screen near the edges', () => {
    expect(placeMenu(100, 100, 240, 300, 1280, 800)).toEqual({ left: 100, top: 100 })
    expect(placeMenu(1200, 100, 240, 300, 1280, 800)).toEqual({ left: 960, top: 100 })
    expect(placeMenu(100, 700, 240, 300, 1280, 800)).toEqual({ left: 100, top: 492 })
  })
})
