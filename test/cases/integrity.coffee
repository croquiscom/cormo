_g = require '../support/common'
{expect} = require 'chai'

module.exports = ->
  it 'ignore', ->
    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
    ]
    team0_id = id_to_record_map.team0.id
    event0_id = id_to_record_map.event0.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    event0 = await _g.connection.Event.find event0_id
    expect(event0.id).to.equal event0_id
    expect(event0.team_id).to.equal team0_id
    return

  it 'nullify (hasMany)', ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
    ]
    team0_id = id_to_record_map.team0.id
    event0_id = id_to_record_map.event0.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    event0 = await _g.connection.Event.find event0_id
    expect(event0.id).to.equal event0_id
    expect(event0.team_id).to.not.exist
    return

  it 'nullify (hasOne)', ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
    ]
    team0_id = id_to_record_map.team0.id
    event0_id = id_to_record_map.event0.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    event0 = await _g.connection.Event.find event0_id
    expect(event0.id).to.equal event0_id
    expect(event0.team_id).to.not.exist
    return

  it 'restrict (hasMany)', ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'restrict'
    _g.connection.Event.belongsTo _g.connection.Team

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
    ]
    # try to delete but must fail
    team0_id = id_to_record_map.team0.id
    try
      await _g.connection.Team.find(team0_id).delete()
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'rejected'
    # not deleted
    team = await _g.connection.Team.find team0_id
    expect(team.name).to.equal 'Croquis'
    # make no dependent records
    await _g.connection.Event.delete()
    # can delete
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    return

  it 'restrict (hasOne)', ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'restrict'
    _g.connection.Event.belongsTo _g.connection.Team

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
    ]
    # try to delete but must fail
    team0_id = id_to_record_map.team0.id
    try
      await _g.connection.Team.find(team0_id).delete()
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'rejected'
    # not deleted
    team = await _g.connection.Team.find team0_id
    expect(team.name).to.equal 'Croquis'
    # make no dependent records
    await _g.connection.Event.delete()
    # can delete
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    return

  it 'delete (hasMany)', ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'delete'

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_team: id: 'team1', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
      { create_event: id: 'event2', team_id: 'team1' }
      { create_event: id: 'event3', team_id: 'team1' }
      { create_comment: event_id: 'event0', content: 'First comment of event0' }
      { create_comment: event_id: 'event0', content: 'Second comment of event0' }
      { create_comment: event_id: 'event2', content: 'First comment of event2' }
    ]
    team0_id = id_to_record_map.team0.id
    event1_id = id_to_record_map.event1.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    try
      await _g.connection.Event.find event1_id
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'not found'
    records = await _g.connection.Comment.where()
    expect(records).to.have.length 1
    expect(records[0].content).to.equal 'First comment of event2'
    return

  it 'delete (hasOne)', ->
    _g.connection.Team.hasOne _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'delete'

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_team: id: 'team1', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team1' }
      { create_comment: event_id: 'event0', content: 'First comment of event0' }
      { create_comment: event_id: 'event0', content: 'Second comment of event0' }
      { create_comment: event_id: 'event1', content: 'First comment of event1' }
    ]
    team0_id = id_to_record_map.team0.id
    event0_id = id_to_record_map.event0.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    try
      await _g.connection.Event.find event0_id
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'not found'
    records = await _g.connection.Comment.where()
    expect(records).to.have.length 1
    expect(records[0].content).to.equal 'First comment of event1'
    return

  it 'nullfy by delete', ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'delete'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment, integrity: 'nullify'

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_team: id: 'team1', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
      { create_event: id: 'event2', team_id: 'team1' }
      { create_event: id: 'event3', team_id: 'team1' }
      { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
      { create_comment: event_id: 'event0', content: 'Second comment of event0' }
      { create_comment: event_id: 'event2', content: 'First comment of event2' }
    ]
    team0_id = id_to_record_map.team0.id
    event0_id = id_to_record_map.event0.id
    comment0_id = id_to_record_map.comment0.id
    count = await _g.connection.Team.find(team0_id).delete()
    expect(count).to.equal 1
    try
      await _g.connection.Event.find event0_id
      throw new Error 'must throw an error.'
    catch error
      expect(error).to.exist
      expect(error.message).to.equal 'not found'
    comment = await _g.connection.Comment.find comment0_id
    expect(comment.content).to.equal 'First comment of event0'
    expect(comment.event_id).to.not.exist
    return

  it 'get inconsistencies', ->
    _g.connection.Team.hasMany _g.connection.Event
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_team: id: 'team1', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
      { create_event: id: 'event2', team_id: 'team1' }
      { create_event: id: 'event3', team_id: 'team1' }
      { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
      { create_comment: id: 'comment1', event_id: 'event0', content: 'Second comment of event0' }
      { create_comment: id: 'comment2', event_id: 'event2', content: 'First comment of event2' }
    ]
    events = [0..1].map (i) -> id_to_record_map['event'+i]
    comments = [2..2].map (i) -> id_to_record_map['comment'+i]
    await _g.connection.Team.find(id_to_record_map.team0.id).delete()
    await _g.connection.Event.find(id_to_record_map.event2.id).delete()

    inconsistencies = await _g.connection.getInconsistencies()
    expect(inconsistencies).to.have.keys 'Event', 'Comment'

    expect(inconsistencies.Event).to.have.length 2
    inconsistencies.Event.sort (a, b) -> if a < b then -1 else 1
    events.sort (a, b) -> if a.id < b.id then -1 else 1
    expect(inconsistencies.Event[0]).to.equal events[0].id
    expect(inconsistencies.Event[1]).to.equal events[1].id

    expect(inconsistencies.Comment).to.have.length 1
    expect(inconsistencies.Comment[0]).to.equal comments[0].id

    return

  it 'get inconsistencies (exclude null)', ->
    _g.connection.Team.hasMany _g.connection.Event, integrity: 'nullify'
    _g.connection.Event.belongsTo _g.connection.Team

    _g.connection.Comment.belongsTo _g.connection.Event
    _g.connection.Event.hasMany _g.connection.Comment

    id_to_record_map = await _g.connection.manipulate [
      { create_team: id: 'team0', name: 'Croquis' }
      { create_team: id: 'team1', name: 'Croquis' }
      { create_event: id: 'event0', team_id: 'team0' }
      { create_event: id: 'event1', team_id: 'team0' }
      { create_event: id: 'event2', team_id: 'team1' }
      { create_event: id: 'event3', team_id: 'team1' }
      { create_comment: id: 'comment0', event_id: 'event0', content: 'First comment of event0' }
      { create_comment: id: 'comment1', event_id: 'event0', content: 'Second comment of event0' }
      { create_comment: id: 'comment2', event_id: 'event2', content: 'First comment of event2' }
    ]
    comments = [2..2].map (i) -> id_to_record_map['comment'+i]
    await _g.connection.Team.find(id_to_record_map.team0.id).delete()
    await _g.connection.Event.find(id_to_record_map.event2.id).delete()

    inconsistencies = await _g.connection.getInconsistencies()
    expect(inconsistencies).to.have.keys 'Comment'

    expect(inconsistencies.Comment).to.have.length 1
    expect(inconsistencies.Comment[0]).to.equal comments[0].id

    return
