import { expect } from 'chai';
import * as cormo from '../..';

export class TeamRef extends cormo.BaseModel {
  name?: string;
}

export class EventRef extends cormo.BaseModel {
  time?: Date;
  team_id?: number;
}

export class CommentRef extends cormo.BaseModel {
  content?: string;
  event_id?: number;
}

export default function (models: {
  Team: typeof TeamRef;
  Event: typeof EventRef;
  Comment: typeof CommentRef;
  connection: cormo.Connection | null;
}) {
  it('ignore', async () => {
    models.Team.hasMany(models.Event);
    models.Event.belongsTo(models.Team);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event0_id = id_to_record_map.event0.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    const event0 = await models.Event.find(event0_id);
    expect(event0.id).to.equal(event0_id);
    expect(event0.team_id).to.equal(team0_id);
  });

  it('nullify (hasMany)', async () => {
    models.Team.hasMany(models.Event, {
      integrity: 'nullify',
    });
    models.Event.belongsTo(models.Team);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event0_id = id_to_record_map.event0.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    const event0 = await models.Event.find(event0_id);
    expect(event0.id).to.equal(event0_id);
    expect(event0.team_id).to.not.exist;
  });

  it('nullify (hasOne)', async () => {
    models.Team.hasOne(models.Event, {
      integrity: 'nullify',
    });
    models.Event.belongsTo(models.Team);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event0_id = id_to_record_map.event0.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    const event0 = await models.Event.find(event0_id);
    expect(event0.id).to.equal(event0_id);
    expect(event0.team_id).to.not.exist;
  });

  it('restrict (hasMany)', async () => {
    models.Team.hasMany(models.Event, {
      integrity: 'restrict',
    });
    models.Event.belongsTo(models.Team);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
    ]);
    // try to delete but must fail
    const team0_id = id_to_record_map.team0.id;
    try {
      await models.Team.find(team0_id).delete();
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('rejected');
    }
    // not deleted
    const team = await models.Team.find(team0_id);
    expect(team.name).to.equal('Croquis');
    // make no dependent records
    await models.Event.delete();
    // can delete
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
  });

  it('restrict (hasOne)', async () => {
    models.Team.hasOne(models.Event, {
      integrity: 'restrict',
    });
    models.Event.belongsTo(models.Team);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
    ]);
    // try to delete but must fail
    const team0_id = id_to_record_map.team0.id;
    try {
      await models.Team.find(team0_id).delete();
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('rejected');
    }
    // not deleted
    const team = await models.Team.find(team0_id);
    expect(team.name).to.equal('Croquis');
    // make no dependent records
    await models.Event.delete();
    // can delete
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
  });

  it('delete (hasMany)', async () => {
    models.Team.hasMany(models.Event, { integrity: 'delete' });
    models.Event.belongsTo(models.Team);
    models.Comment.belongsTo(models.Event);
    models.Event.hasMany(models.Comment, { integrity: 'delete' });
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_team: { id: 'team1', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
      { create_event: { id: 'event2', team_id: 'team1' } },
      { create_event: { id: 'event3', team_id: 'team1' } },
      { create_comment: { event_id: 'event0', content: 'First comment of event0' } },
      { create_comment: { event_id: 'event0', content: 'Second comment of event0' } },
      { create_comment: { event_id: 'event2', content: 'First comment of event2' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event1_id = id_to_record_map.event1.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    try {
      await models.Event.find(event1_id);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('not found');
    }
    const records = await models.Comment.where();
    expect(records).to.have.length(1);
    expect(records[0].content).to.equal('First comment of event2');
  });

  it('delete (hasOne)', async () => {
    models.Team.hasOne(models.Event, {
      integrity: 'delete',
    });
    models.Event.belongsTo(models.Team);
    models.Comment.belongsTo(models.Event);
    models.Event.hasMany(models.Comment, {
      integrity: 'delete',
    });
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_team: { id: 'team1', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team1' } },
      { create_comment: { event_id: 'event0', content: 'First comment of event0' } },
      { create_comment: { event_id: 'event0', content: 'Second comment of event0' } },
      { create_comment: { event_id: 'event1', content: 'First comment of event1' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event0_id = id_to_record_map.event0.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    try {
      await models.Event.find(event0_id);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('not found');
    }
    const records = await models.Comment.where();
    expect(records).to.have.length(1);
    expect(records[0].content).to.equal('First comment of event1');
  });

  it('nullfy by delete', async () => {
    models.Team.hasMany(models.Event, {
      integrity: 'delete',
    });
    models.Event.belongsTo(models.Team);
    models.Comment.belongsTo(models.Event);
    models.Event.hasMany(models.Comment, {
      integrity: 'nullify',
    });
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_team: { id: 'team1', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
      { create_event: { id: 'event2', team_id: 'team1' } },
      { create_event: { id: 'event3', team_id: 'team1' } },
      { create_comment: { id: 'comment0', event_id: 'event0', content: 'First comment of event0' } },
      { create_comment: { event_id: 'event0', content: 'Second comment of event0' } },
      { create_comment: { event_id: 'event2', content: 'First comment of event2' } },
    ]);
    const team0_id = id_to_record_map.team0.id;
    const event0_id = id_to_record_map.event0.id;
    const comment0_id = id_to_record_map.comment0.id;
    const count = await models.Team.find(team0_id).delete();
    expect(count).to.equal(1);
    try {
      await models.Event.find(event0_id);
      throw new Error('must throw an error.');
    } catch (error: any) {
      expect(error).to.exist;
      expect(error.message).to.equal('not found');
    }
    const comment = await models.Comment.find(comment0_id);
    expect(comment.content).to.equal('First comment of event0');
    expect(comment.event_id).to.not.exist;
  });

  it('get inconsistencies', async () => {
    models.Team.hasMany(models.Event);
    models.Event.belongsTo(models.Team);
    models.Comment.belongsTo(models.Event);
    models.Event.hasMany(models.Comment);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_team: { id: 'team1', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
      { create_event: { id: 'event2', team_id: 'team1' } },
      { create_event: { id: 'event3', team_id: 'team1' } },
      { create_comment: { id: 'comment0', event_id: 'event0', content: 'First comment of event0' } },
      { create_comment: { id: 'comment1', event_id: 'event0', content: 'Second comment of event0' } },
      { create_comment: { id: 'comment2', event_id: 'event2', content: 'First comment of event2' } },
    ]);
    const events = [0, 1].map(function (i) {
      return id_to_record_map['event' + i];
    });
    const comments = [2].map(function (i) {
      return id_to_record_map['comment' + i];
    });
    await models.Team.find(id_to_record_map.team0.id).delete();
    await models.Event.find(id_to_record_map.event2.id).delete();
    const inconsistencies = await models.connection!.getInconsistencies();
    expect(inconsistencies).to.have.keys('Event', 'Comment');
    expect(inconsistencies.Event).to.have.length(2);
    inconsistencies.Event.sort((a: any, b: any) => {
      if (a < b) {
        return -1;
      } else {
        return 1;
      }
    });
    events.sort((a, b) => {
      if (a.id < b.id) {
        return -1;
      } else {
        return 1;
      }
    });
    expect(inconsistencies.Event[0]).to.equal(events[0].id);
    expect(inconsistencies.Event[1]).to.equal(events[1].id);
    expect(inconsistencies.Comment).to.have.length(1);
    expect(inconsistencies.Comment[0]).to.equal(comments[0].id);
  });

  it('get inconsistencies (exclude null)', async () => {
    models.Team.hasMany(models.Event, {
      integrity: 'nullify',
    });
    models.Event.belongsTo(models.Team);
    models.Comment.belongsTo(models.Event);
    models.Event.hasMany(models.Comment);
    const id_to_record_map = await models.connection!.manipulate([
      { create_team: { id: 'team0', name: 'Croquis' } },
      { create_team: { id: 'team1', name: 'Croquis' } },
      { create_event: { id: 'event0', team_id: 'team0' } },
      { create_event: { id: 'event1', team_id: 'team0' } },
      { create_event: { id: 'event2', team_id: 'team1' } },
      { create_event: { id: 'event3', team_id: 'team1' } },
      { create_comment: { id: 'comment0', event_id: 'event0', content: 'First comment of event0' } },
      { create_comment: { id: 'comment1', event_id: 'event0', content: 'Second comment of event0' } },
      { create_comment: { id: 'comment2', event_id: 'event2', content: 'First comment of event2' } },
    ]);
    const comments = [2].map(function (i) {
      return id_to_record_map['comment' + i];
    });
    await models.Team.find(id_to_record_map.team0.id).delete();
    await models.Event.find(id_to_record_map.event2.id).delete();
    const inconsistencies = await models.connection!.getInconsistencies();
    expect(inconsistencies).to.have.keys('Comment');
    expect(inconsistencies.Comment).to.have.length(1);
    expect(inconsistencies.Comment[0]).to.equal(comments[0].id);
  });
}
