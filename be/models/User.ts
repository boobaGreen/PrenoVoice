import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// Middleware pre-save per l'hashing della password
UserSchema.pre('save', async function (next) {
    // Esegui l'hash solo se la password è stata modificata
    if (!this.isModified('password')) return next();

    try {
        // Genera un salt e l'hash della password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Metodo per confrontare le password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Configurazione per escludere la password dalle risposte JSON
UserSchema.set('toJSON', {
    transform: function (_doc, ret) {
        delete ret.password;
        return ret;
    }
});

export default model<IUser>('User', UserSchema);