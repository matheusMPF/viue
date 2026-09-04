import { PROFILE_CONFIG, type ProfileSlug } from '@/lib/profile/profiles';

export function ComingSoonScreen({ profile }: { profile: ProfileSlug }) {
  const config = PROFILE_CONFIG[profile];
  const Icon = config.icon;

  return (
    <div className="home-workspace">
      <main className="profile-coming-soon" role="status">
        <Icon aria-hidden="true" size={36} />
        <span className="home-kicker">Em breve</span>
        <h1>{config.label} ainda não chegou por aqui.</h1>
        <p>
          Estamos preparando essa experiência. Continue aproveitando Filmes e Séries enquanto isso.
        </p>
      </main>
    </div>
  );
}
