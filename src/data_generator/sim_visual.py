import numpy as np
import pandas as pd
import math
from scipy.optimize import minimize, rosen
import matplotlib.pyplot as plt
import argparse


parser = argparse.ArgumentParser(description='v0,T,s0,a,b,follower')
parser.add_argument('--v0', default=50, type=float)
parser.add_argument('--T', default=1, type=float)
parser.add_argument('--s0', default=0.4, type=float)
parser.add_argument('--a', default=2, type=float)
parser.add_argument('--b', default=4, type=float)
parser.add_argument('--fol', default=20, type=int)

args = parser.parse_args()


def rotate_matrix(x, y, angle, x_shift=0, y_shift=0, units="DEGREES"):

    # Shift to origin (0,0)
    x = x - x_shift
    y = y - y_shift

    # Convert degrees to radians
    if units == "DEGREES":
        angle = math.radians(angle)

    # Rotation matrix multiplication to get rotated x & y
    xr = (x * math.cos(angle)) - (y * math.sin(angle)) + x_shift
    yr = (x * math.sin(angle)) + (y * math.cos(angle)) + y_shift

    return xr, yr


def data_rot(tracks):
    tracks['x_rot'], tracks['y_rot'] = pd.Series(
        rotate_matrix(tracks['x[m]'], tracks['y[m]'], 26.5))
    return tracks


def data_antirot(tracks):
    tracks['x[m]'], tracks['y[m]'] = pd.Series(
        rotate_matrix(tracks['x_rot'], tracks['y_rot'], - 26.5))
    return tracks


class IDM:
    def __init__(self, v0, T, s0, a, b):
        self.v0 = v0
        self.T = T
        self.s0 = s0
        self.a = a
        self.b = b

        self.speed_limit = 1000
        self.bmax = 9
        print('chun')

    # free acceleration equation
    '''
    @param v: actual speed (m/s)
    @return : free acceleration (m/s**2)
    '''

    def calcAccFree(self, v):

        # determine valid local v0

        v0eff = np.maximum(0.01, np.minimum(self.v0, self.speed_limit))

        accFree = self.a*(1-math.pow(v/v0eff, 4)
                          ) if v < v0eff else self.a*(1-(v/v0eff))

        return accFree

    # interaction Acceleration equation

    '''
    @param s:     actual gap [m]
    @param v:     actual speed [m/s]
    @param vl:    leading speed [m/s]
    @return:  acceleration [m/s^2]
    '''

    def calcAccInt(self, s, v, vl):

        sstar = self.s0 + \
            np.maximum(0, v*self.T + 0.5*v*(v-vl)/np.sqrt(self.a*self.b))

        accInt = -self.a*math.pow(sstar/np.maximum(s, 0.1*self.s0), 2)

        # return np.maximum(-self.bmax,accInt)
        return accInt

    # Final longitudinal acceleration equation

    def calcAccLong(self, s, v, vl):
        accLong = np.maximum(-self.bmax, self.calcAccFree(v) +
                             self.calcAccInt(s, v, vl))
        # if self.v0>6.8 and self.v0<7.0:
        if False:
            sstar = self.s0 + \
                np.maximum(0, v*self.T + 0.5*v*(v-vl)/np.sqrt(self.a*self.b))
            print(f' calcAcclong: s=', s, ' sstar=',
                  sstar, ' accIDM=', accLong)

        return accLong


def sim(v0, T, s0, a, b, data):
    count = 0
    GAP_MIN = 0.4
    data = data.reset_index()
    dt = 0.033367
    CF = IDM(v0, T, s0, a, b)

    # convert pandas dataframe to arrays since left-assignment faster
    v1 = np.empty(len(data), dtype=float)
    gap1 = np.empty(len(data), dtype=float)
    acc1 = np.empty(len(data), dtype=float)
    x1 = np.empty(len(data), dtype=float)

    # export data gaps to numpy array to  limit gap to values >=GAP_VAL
    # !!! by reference, also original data['gap[m]'] affected by mainpul gapData

    gapData = data['gap[m]'].to_numpy()
    for i in range(0, len(data)):
        gapData[i] = max(GAP_MIN, gapData[i])

    # initialisation

    v1[0] = data.loc[0, 'vx[m/s]']
    gap1[0] = gapData[0]  # max(GAP_MIN,data.loc[0,'gap[m]'])
    acc1[0] = CF.calcAccLong(gap1[0], v1[0], data.loc[0, 'lead_vx'])

    # simulation

    for i in range(1, len(data)):
        # if i<1181:
        if False:
            print(f'\nsim: time step i=', i,
                  ' gap1[i-1]=', gap1[i-1], ' v1[i-1]=', v1[i-1])

        v1[i] = v1[i-1]+acc1[i-1]*dt
        v_lead = 0.5*(data.loc[i-1, 'lead_vx']+data.loc[i, 'lead_vx'])
        gap1[i] = gap1[i-1]+(v_lead-0.5*(v1[i]+v1[i-1]))*dt

        # if estimated speed negative, assume a stop and no further decel
        # (before possible gap reset because gap reset is dominating the actions)

        if v1[i] < -1e-6:  # then acc1 strictly<0
            v1[i] = 0
            gap1[i] = gap1[i-1]+v_lead*dt - (-0.5*v1[i-1]**2/acc1[i-1])

        # reset gap if new leader

        if data.loc[i, 'Leader'] != data.loc[i-1, 'Leader']:
            # v1[i]=data.loc[i,'vx[m/s]']  #!! No speed reset!
            gap1[i] = gapData[i]  # data.loc[i,'gap[m]']

         # reset for change in follower gap if new follower
        if data.loc[i, 'Follower'] != data.loc[i-1, 'Follower']:
            count += 1
            v1[i] = data.loc[i, 'vx[m/s]']  # !! No speed reset!
            gap1[i] = gapData[i]  # data.loc[i,'gap[m]']

        # x1=gapData[i]-gap1[i]-data.loc[i,'Follower x_rotated']
        x1 = data.loc[i, 'Follower x_rotated']

        acc1[i] = CF.calcAccLong(gap1[i], v1[i], data.loc[i, 'lead_vx'])

        if False:
            # if i<10:
            print(
                f'i={i} sLast={gap1[i-1]} vLast={v1[i-1]} vlLast={data.loc[i-1, "lead_vx"]} acc1[i-1]={acc1[i-1]}')

    # re-convert arrays to dataframe to be consistent
    # (this one-shot conversion is fast)

    data['v1'] = v1.tolist()
    data['gap1'] = gap1.tolist()
    data['acc1'] = acc1.tolist()
    data['x1'] = x1.tolist()
    data = data.rename(columns={'Follower y_rotated': 'y1'})
    sse = sum((data['gap1']-data['gap[m]'])**2)
    sse1 = sum((gapData-gap1)**2)
    avg_error = np.sqrt(sse/len(data))

    follower_data = data[['Follower', 'Time [s]',
                          'x1', 'y1', 'v1', 'Follower Vehicle Type']]
    follower_data['Follower Vehicle Type'] = follower_data['Follower Vehicle Type'].replace(
        'Motorcycle', 'Medium Vehicle')

    follower_data.columns = ['vehicle_id', 'Time [s]',
                             'x_rot', 'y_rot', 'Speed [km/h]', 'flw_type']

    follower_data = data_antirot(follower_data)

    follower_data = follower_data[[
        'vehicle_id', 'Time [s]', 'x[m]', 'y[m]', 'Speed [km/h]', 'flw_type']]
    # Replace 'Motorcycle' with 'Medium Vehicle' in follower data

    return [sse, avg_error, data, follower_data]


def data_sim(data_ideal, follower):
    return data_ideal[data_ideal['Follower'] == follower]


if __name__ == '__main__':
    path = '/Volumes/AKHIL7176/TU DRESDEN PC/THESIS/Thesis_main_code/public'
    data = pd.read_csv(fr'{path}/AllD_T1_lanes_2.csv')
    data_lf = pd.read_csv(fr'{path}/LF_data.csv')
    data_lf = data_lf.rename(columns={
                             'Gap between vehicles': 'gap[m]', 'Follower Speed': 'vx[m/s]', 'Leader Speed': 'lead_vx'})
    follower = args.fol
    data_fol = data_sim(data_lf, follower)
    leaders = data_fol['Leader'].unique()

    l_data = data.loc[data['vehicle_id'].isin(
        leaders), ['vehicle_id', 'Time [s]', 'x[m]', 'y[m]', 'Speed [km/h]', 'flw_type']]
    l_data['flw_type'] = l_data['flw_type'].replace(
        'Motorcycle', 'Medium Vehicle')

    v0 = args.v0
    T = args.T
    s0 = args.s0
    a = args.a
    b = args.b

    f_data = sim(v0, T, s0, a, b, data_fol)[3]

    out_data = pd.concat((l_data, f_data))
    out_data1 = out_data.sort_values(
        by=['vehicle_id', 'Time [s]'], ascending=True)

    out_data1.to_csv(
        fr'./public/output_data.csv', index=False)
