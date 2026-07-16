const sequelize = require('../config/database')
const { DataTypes, idAttributes } = require('./modelUtils')

const Workout = sequelize.define('Workout', {
  ...idAttributes(),
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reps: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  load: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Workouts',
  timestamps: true
})

module.exports = Workout
