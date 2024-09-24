import { useEffect, useState } from 'react';
import mongoose from 'mongoose';
import Map from '@/models/Map';
import Head from 'next/head';
import { useRouter } from 'next/router';
import styles from '@/styles/MapPage.module.css'; // Import CSS module for styling
import formatNumber from '@/components/utils/fmtNumber';
import Navbar from '@/components/ui/navbar';
import Link from 'next/link';
import User from '@/models/User';
import msToTime from '@/components/msToTime';
import { useTranslation } from 'next-i18next'

import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import officialCountryMaps from '@/public/officialCountryMaps.json';
import { FaInfinity } from 'react-icons/fa6';
import { getSession } from 'next-auth/react';

export async function getServerSideProps(context) {
  const { slug } = context.params;
  const locale = context.locale;

  const cntryMap = Object.values(officialCountryMaps).find(map => map.slug === slug);
  if(cntryMap) {
    return {
      props: {
        mapData: {...JSON.parse(JSON.stringify(cntryMap)),
          description_short: cntryMap.shortDescription,
          description_long: cntryMap.longDescription,
          created_by: "WorldGuessr",
          in_review: false,
          rejected: false
        },
        ...(await serverSideTranslations(locale, [
          'common',
        ]))
      }
    };
  }

  const session = await getSession(context);
  const staff = session?.token?.staff;

  const map = await Map.findOne({ slug }).lean();
  if (!map) {
    // 404
    return {
      notFound: true,
    };
  }

  const authorId = map.created_by;
  const authorUser = await User.findById(authorId).lean();
  const authorSecret = authorUser?.secret;


  const isCreatorOrStaff = session && (authorSecret === session?.token?.secret || staff);

  if (!map.accepted && !isCreatorOrStaff) {
    return {
      notFound: true,
    };
  }

  map.created_by = authorUser?.username;
  map.created_at = msToTime(Date.now() - map.created_at);

  return {
    props: {
      mapData: JSON.parse(JSON.stringify(map)),
      ...(await serverSideTranslations(locale, [
        'common',
      ]))
    }
  };
}

export default function MapPage({ mapData }) {
  const router = useRouter();
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const [locationUrls, setLocationUrls] = useState([]);
  const [fadeClass, setFadeClass] = useState(styles.iframe);
  const { t: text } = useTranslation('common');

  useEffect(() => {
    if (!mapData.data) return;

    const urls = mapData.data.map(location =>
      `//www.google.com/maps/embed/v1/streetview?key=AIzaSyA2fHNuyc768n9ZJLTrfbkWLNK3sLOK-iQ&location=${location.lat},${location.lng}&fov=60`
    );
    setLocationUrls(urls);

    const intervalId = setInterval(() => {
      setFadeClass(styles.iframe + ' ' + styles.fadeOut);
      setTimeout(() => {
        setCurrentLocationIndex(Math.floor(Math.random() * urls.length));
        setFadeClass(styles.iframe + ' ' + styles.fadeIn);
      }, 1000);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [mapData.data]);

  const handlePlayButtonClick = () => {
    window.location.href = `/?map=${mapData.countryCode || mapData.slug}`;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>{mapData.name + " - Play Free on WorldGuessr"}</title>
        <meta name="description" content={`Explore ${mapData.name} on WorldGuessr, a free GeoGuessr clone. ${mapData.description_short}`} />
    <link rel="icon" type="image/x-icon" href="/icon.ico" />

      </Head>
      <style>
        {`
          .mainBody {
            user-select: auto !important;
            overflow: auto !important;
          }
        `}
      </style>
      <main className={styles.main}>
        <Navbar />

        {mapData.in_review && (
          <div className={styles.statusMessage}>
            <p>⏳ This map is currently under review.</p>
          </div>
        )}

        {mapData.reject_reason && (
          <div className={styles.statusMessage}>
            <p>❌ This map has been rejected: {mapData.reject_reason}</p>
          </div>
        )}

        <div className={styles.branding}>
          <h1>WorldGuessr</h1>
          <p>{text('freeGeoguessrAlt')}</p>
          <center>
            <button onClick={() => window.location.href="/"} className={styles.backButton}>
              ← {text('backToGame')}
            </button>
          </center>
        </div>

        <div className={styles.mapHeader}>
          <div className={styles.mapImage}>
            {locationUrls.length > 0 && (
              <div className={styles.iframeContainer}>
                <iframe
                  className={fadeClass}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={locationUrls[currentLocationIndex]}
                ></iframe>
              </div>
            )}

            {mapData.countryCode && (
              <img src={`https://flagcdn.com/w2560/${mapData.countryCode?.toLowerCase()}.png`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
          </div>
          <div className={styles.mapInfo}>
            <h1>{mapData.name}</h1>
            <p>{mapData.description_short}</p>
          </div>
        </div>
        <button className={styles.playButton} onClick={handlePlayButtonClick}>
          PLAY
        </button>
        <div className={styles.mapStats}>
          {typeof mapData.plays !== "undefined" && (
            <div className={styles.stat}>
              <span className={styles.statIcon}>👥</span>
              <span className={styles.statValue}>{mapData.plays.toLocaleString()}</span>
              <span className={styles.statLabel}>Plays</span>
            </div>
          )}

          <div className={styles.stat}>
            <span className={styles.statIcon}>📍</span>
            <span className={styles.statValue}>{mapData.data ? formatNumber(mapData.data.length, 3) : <FaInfinity />}</span>
            <span className={styles.statLabel}>Locations</span>
          </div>
          {typeof mapData.hearts !== "undefined" && (
            <div className={styles.stat}>
              <span className={styles.statIcon}>❤️</span>
              <span className={styles.statValue}>{mapData.hearts.toLocaleString()}</span>
              <span className={styles.statLabel}>Hearts</span>
            </div>
          )}
        </div>

        <div className={styles.mapDescription}>
          <h2>About this map</h2>
          {mapData.description_long.split('\n').map((line, index) => <p key={index}>{line}</p>)}
          <p className={styles.mapAuthor}>
            Created by <strong>{mapData.created_by}</strong>
            {mapData.created_at && (
              ` ${mapData.created_at} ago`
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
