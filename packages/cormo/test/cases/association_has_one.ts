import { expect } from 'chai';
import { ComputerRef, PostRef, UserRef } from './association';

export default function(models: {
  Computer: typeof ComputerRef;
  Post: typeof PostRef;
  User: typeof UserRef;
}) {
  it('get associated object', async () => {
    const user = await models.User.create({ name: 'John Doe', age: 27 });
    const computer = await models.Computer.create({ brand: 'Maple', user_id: user.id });
    const record = await user.computer!();
    expect(computer).to.eql(record);
  });
}
